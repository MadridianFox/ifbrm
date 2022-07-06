async function getVirtualServiceByName(k8sApi, namespace, serviceName) {
    return await k8sApi.getNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        serviceName
    ).then((response) => {
        return response.body
    }).catch(() => {
        return undefined
    })
}

async function createVirtualService(k8sApi, namespace, serviceName, version) {
    k8sApi.createNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        {
            apiVersion: 'networking.istio.io/v1alpha3',
            kind: 'VirtualService',
            metadata: {name: serviceName},
            spec: {
                hosts: [serviceName],
                http: [
                    {
                        match: [{headers: {"X-Route-Key": {exact: version}}}],
                        route: [{destination: {host: serviceName, subset: version}}]
                    },
                    {
                        route: [{destination: {host: serviceName, subset: 'master'}}]
                    }
                ]
            }
        }
    )
}

async function deleteVirtualService(k8sApi, namespace, serviceName) {
    await k8sApi.deleteNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        serviceName
    )
}

function findRule(vs, headerName, headerValue) {
    for (let index in vs.spec.http) {
        let rule = vs.spec.http[index]
        if (false === 'match' in rule) continue
        for (let match of rule.match) {
            if (false === 'headers' in match) continue
            if (false === headerName in match.headers) continue
            if (false === 'exact' in match.headers[headerName]) continue
            if (match.headers[headerName].exact === headerValue) {
                return index
            }
        }
    }
    return undefined
}

function countRules(vs) {
    return vs.spec.http.length
}

async function addRule(k8sApi, namespace, serviceName, headerValue) {
    await k8sApi.patchNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        serviceName,
        [{
            op: 'add',
            path: '/spec/http/0',
            value: {
                match: [{headers: {'X-Route-Key': {exact: headerValue}}}],
                route: [{destination: {host: serviceName, subset: headerValue}}]
            }
        }],
        undefined,
        undefined,
        undefined,
        {headers: {"Content-Type": 'application/json-patch+json'}}
    )
}

async function deleteRule(k8sApi, namespace, serviceName, index) {
    await k8sApi.patchNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        serviceName,
        [{
            op: 'remove',
            path: `/spec/http/${index}`,
        }],
        undefined,
        undefined,
        undefined,
        {headers: {"Content-Type": 'application/json-patch+json'}}
    )
}

function info(name, message) {
    console.log(`VirtualService ${name}: ${message}`)
}

module.exports.sync = async function (k8sApi, namespace, serviceName, version, add) {
    let vs = await getVirtualServiceByName(k8sApi, namespace, serviceName)
    if (vs === undefined) {
        if (add) {
            await createVirtualService(k8sApi, namespace, serviceName, version)
            info(serviceName, 'created')
        } else {
            info(serviceName, 'not found')
        }
    } else {
        let ruleIndex = findRule(vs, 'X-Route-Key', version)
        if (add) {
            if (ruleIndex === undefined) {
                await addRule(k8sApi, namespace, serviceName, version)
                info(serviceName, 'rule added')
            } else {
                info(serviceName, 'not changed')
            }
        } else {
            if (ruleIndex === undefined) {
                info(serviceName, 'not changed')
            } else {
                if (countRules(vs) === 2) {
                    await deleteVirtualService(k8sApi, namespace, serviceName)
                    info(serviceName, 'removed')
                } else {
                    await deleteRule(k8sApi, namespace, serviceName, ruleIndex)
                    info(serviceName, 'rule removed')
                }
            }
        }
    }
}

