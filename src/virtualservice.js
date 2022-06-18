function findRule(vs, headerName, headerValue) {
	for (let index in vs.spec.http) {
		let rule = vs.spec.http[index]
		if (false === 'match' in rule) continue
		for (let match of rule.match) {
			if (false === 'headers' in match) continue
			if (false === headerName in match.headers) continue
			if (false === 'exact' in match.headers[headerName]) continue
			if (match.headers[headerName].exact == headerValue) {
				return index
			}
		}
	}
	return undefined
}

async function addRule(k8sApi, namespace, serviceName, headerName, headerValue) {
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
				match: [{
					headers: {
						[headerName]: {exact: headerValue}
					}
				}],
				route: [{
					destination: {
						host: serviceName,
						subset: headerValue
					}
				}]
			}
		}],
        undefined,
        undefined,
        undefined,
        {headers: { "Content-Type": 'application/json-patch+json'}}
	)
}

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
		console.log("Getting custom object failed")
		return undefined
	})
}

module.exports.sync = async function (k8sApi, namespace, serviceName, version) {
	let vs = await getVirtualServiceByName(k8sApi, namespace, serviceName)
	if (vs === undefined ) {
		// todo create vs
		console.log(`VirtualService ${serviceName} not found`)
	} else {
	    let ruleIndex = findRule(vs, 'X-Route-Key', version)
	    if (ruleIndex == undefined) {
	    	await addRule(k8sApi, namespace, serviceName, 'X-Route-Key', version)
	    }
	}

}

