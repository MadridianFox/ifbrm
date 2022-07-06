async function getDestinationRuleByName(k8sApi, namespace, serviceName) {
    return await k8sApi.getNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'destinationrules',
        serviceName
    ).then((response) => {
        return response.body
    }).catch(() => {
        return undefined
    })
}

async function createDestinationRule(k8sApi, namespace, serviceName, version) {
    k8sApi.createNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'destinationrules',
        {
            apiVersion: 'networking.istio.io/v1alpha3',
            kind: 'DestinationRule',
            metadata: {name: serviceName},
            spec: {
                host: serviceName,
                subsets: [
                    {name: 'master', labels: {version: 'master'}},
                    {name: version, labels: {version: version}}
                ]
            }
        }
    )
}

async function deleteDestinationRule(k8sApi, namespace, serviceName) {
    await k8sApi.deleteNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'destinationrules',
        serviceName
    )
}


function findSubset(dr, version) {
    for (let index in dr.spec.subsets) {
        let subset = dr.spec.subsets[index]
        if (subset.name === version) {
            return index
        }
    }
    return undefined
}

function countSubsets(dr) {
    return dr.spec.subsets.length
}

async function addSubset(k8sApi, namespace, serviceName, version) {
    await k8sApi.patchNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'destinationrules',
        serviceName,
        [{
            op: 'add',
            path: '/spec/subsets/1',
            value: {
                name: version,
                labels: {
                    version: version
                }
            }
        }],
        undefined,
        undefined,
        undefined,
        {headers: {"Content-Type": 'application/json-patch+json'}}
    )
}

async function deleteSubset(k8sApi, namespace, serviceName, index) {
    await k8sApi.patchNamespacedCustomObject(
        'networking.istio.io',
        'v1alpha3',
        namespace,
        'destinationrules',
        serviceName,
        [{
            op: 'remove',
            path: `/spec/subsets/${index}`,
        }],
        undefined,
        undefined,
        undefined,
        {headers: {"Content-Type": 'application/json-patch+json'}}
    )
}

function info(name, message) {
    console.log(`DestinationRule ${name}: ${message}`)
}

module.exports.sync = async function (k8sApi, namespace, serviceName, version, add) {
    let dr = await getDestinationRuleByName(k8sApi, namespace, serviceName)
    if (dr === undefined) {
        if (add) {
            await createDestinationRule(k8sApi, namespace, serviceName, version)
            info(serviceName, 'created')
        } else {
            info(serviceName, 'not found')
        }
    } else {
        let subsetIndex = findSubset(dr, version)
        if (add) {
            if (subsetIndex === undefined) {
                await addSubset(k8sApi, namespace, serviceName, version)
                info(serviceName, 'subsed added')
            } else {
                info(serviceName, 'not changed')
            }
        } else {
            if (subsetIndex === undefined) {
                info(serviceName, 'not changed')
            } else {
                if (countSubsets(dr) === 2) {
                    await deleteDestinationRule(k8sApi, namespace, serviceName)
                    info(serviceName, 'removed')
                } else {
                    await deleteSubset(k8sApi, namespace, serviceName, subsetIndex)
                    info(serviceName, 'subset removed')
                }
            }
        }
    }
}

