const k8s = require('@kubernetes/client-node')
const {program} = require('commander')
const DestinationRule = require('./src/destinationrule')
const VirtualService = require('./src/virtualservice')
const VirtualServiceGateway = require('./src/virtualservice-gateway')

const kubeConfig = new k8s.KubeConfig()
kubeConfig.loadFromDefault()
const k8sApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi)


program
    .command('add')
    .description('add route to specific service version')
    .requiredOption('--namespace <namespace>')
    .requiredOption('--name <name>')
    .requiredOption('--version <version>')
    .option('--gateway', null, false)
    .option('--host-template <hostTemplate>')
    .action(async (options) => {
        console.log(options)
        await DestinationRule.sync(k8sApi, options.namespace, options.name, options.version, true)
        if (options.gateway) {
            await VirtualServiceGateway.sync(k8sApi, options.namespace, options.name, options.version, true, options.hostTemplate)
        } else {
            await VirtualService.sync(k8sApi, options.namespace, options.name, options.version, true)
        }
    })

program
    .command('remove')
    .description('remove route to specific service version')
    .requiredOption('--namespace <namespace>')
    .requiredOption('--name <name>')
    .requiredOption('--version <version>')
    .requiredOption('--gateway')
    .action(async (options) => {
        await DestinationRule.sync(k8sApi, options.namespace, options.name, options.version, false)
        if (options.gateway) {
            await VirtualServiceGateway.sync(k8sApi, options.namespace, options.name, options.version, false)
        } else {
            await VirtualService.sync(k8sApi, options.namespace, options.name, options.version, false)
        }
    })

program.parse(process.argv)
