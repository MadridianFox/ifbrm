const k8s = require('@kubernetes/client-node')
const {program} = require('commander')
const DestinationRule = require('./src/destinationrule')
const VirtualService = require('./src/virtualservice')

const kubeConfig = new k8s.KubeConfig()
kubeConfig.loadFromDefault()
const k8sApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi)


program
	.command('add')
	.description('add route to specific service version')
	.requiredOption('--namespace <namespace>')
	.requiredOption('--name <name>')
	.requiredOption('--version <version>')
	.action(async (options) => {
		await DestinationRule.sync(k8sApi, options.namespace, options.name, options.version)
		await VirtualService.sync(k8sApi, options.namespace, options.name, options.version)
	})

program.parse(program.argv)
