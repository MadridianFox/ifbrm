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
		console.log("Getting custom object failed")
		return undefined
	})
}

function findSubset(dr, subsetName) {
	for (let index in dr.spec.subsets) {
		let subset = dr.spec.subsets[index]
		if (subset.name == subsetName) {
			return index
		}
	}
	return undefined
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
        {headers: { "Content-Type": 'application/json-patch+json'}}
	)
}

module.exports.sync = async function (k8sApi, namespace, serviceName, version) {
	let dr = await getDestinationRuleByName(k8sApi, namespace, serviceName)
	if (dr == undefined) {
		// todo create destinationrule
	} else {
	    let subsetIndex = findSubset(dr, version)
		if (subsetIndex === undefined) {
			await addSubset(k8sApi, namespace, serviceName, version)
		}
	}
}
