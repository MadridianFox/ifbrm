async function getVirtualServiceByName(k8sApi, namespace, serviceName, version) {
    return await k8sApi.getNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        vsGatewayName(serviceName, version)
    ).then((response) => {
        return response.body
    }).catch(() => {
        return undefined
    })
}

async function createVirtualService(k8sApi, namespace, serviceName, version, hostTemplate) {
    let host = hostTemplate
        .replace('{serviceName}', serviceName)
        .replace('{version}', version)
    await k8sApi.createNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        {
            apiVersion: 'networking.istio.io/v1alpha3',
            kind: 'VirtualService',
            metadata: {name: vsGatewayName(serviceName, version)},
            spec: {
                hosts: [host],
                gateways: ['default-gateway'],
                http: [
                    {
                        route: [{
                            destination: {host: serviceName, subset: 'master'},
                            headers: {
                                request: {add: {"x-route-key": version}}
                            }
                        }]
                    }
                ]
            }
        }
    )
}

async function deleteVirtualService(k8sApi, namespace, serviceName, version) {
    await k8sApi.deleteNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'virtualservices',
        vsGatewayName(serviceName, version)
    )
}

function vsGatewayName(serviceName, version) {
    return `${serviceName}-${version}`;
}

function info(name, message) {
    console.log(`VirtualService ${name}: ${message}`)
}

module.exports.sync = async function (k8sApi, namespace, serviceName, version, add, hostTemplate) {
    let vs = await getVirtualServiceByName(k8sApi, namespace, serviceName, version)
    let vsName = vsGatewayName(serviceName, version)
    if (vs === undefined) {
        if (add) {
            await createVirtualService(k8sApi, namespace, serviceName, version, hostTemplate)
            info(vsName, 'created')
        } else {
            info(vsName, 'not found')
        }
    } else {
        if (add) {
            info(vsName, 'not changed')
        } else {
            await deleteVirtualService(k8sApi, namespace, serviceName, version)
            info(vsName, 'removed')
        }
    }
}

