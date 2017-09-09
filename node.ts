import api = require('@kubernetes/typescript-node');
import azureResource = require('azure-arm-resource');
import providers = require('./providers');

let handleError = (err: Error) => {
    console.log('Error!');
    console.log(err);
};

let provider_registered = false;

async function getConditions(rsrcClient: azureResource.ResourceManagementClient, last: Date ){
    let conditions = new Array<api.V1NodeCondition>();
    conditions.push(
        {
            lastHeartbeatTime: new Date(),
            lastTransitionTime: last,
            message: 'kubelet is posting ready',
            reason: 'KubeletReady',
            status: 'True',
            type: 'Ready'
        } as api.V1NodeCondition,
    );
    conditions.push(
        {
            lastHeartbeatTime: new Date(),
            lastTransitionTime: last,
            message: 'kubelet has sufficient disk space available',
            reason: 'KubeletHasSufficientDisk',
            status: 'False',
            type: 'OutOfDisk'
        } as api.V1NodeCondition
    );

    if (!provider_registered) {
        let provider = await providers.getProvider(rsrcClient);
        if (provider['registrationState'] != 'Registered') {
            conditions.push(
                {
                    lastHeartbeatTime: new Date(),
                    lastTransitionTime: last,
                    message: 'Microsoft.ContainerInstance not registered',
                    reason: 'ProviderRegistered',
                    status: 'False',
                    type: 'ProviderStatus'
                } as api.V1NodeCondition
            );
        } else {
            // We will switch this flag once in a run..
            provider_registered = true;
        }
    }
    return conditions;
}

let updateNode = async (name: string, rsrcClient: azureResource.ResourceManagementClient, transition: Date, client: api.Core_v1Api, keepRunning: () => boolean) => {
    console.log('sending update.');
    try {
        if (!keepRunning()) {
		return;
	}
        let result = await client.readNode(name);
        let node = result.body as api.V1Node;
        node.metadata.resourceVersion = null;
        node.status = {
            nodeInfo: {
                kubeletVersion: 'v1.6.6',
                architecture: "amd64"
            } as api.V1NodeSystemInfo,
            conditions: await getConditions(rsrcClient, transition),
            addresses: [] as Array<api.V1NodeAddress>
        } as api.V1NodeStatus;
        node.status.allocatable = {
            "cpu": "20",
            "memory": "100Gi",
            "pods": "20"
        };
        // TODO: Count quota here...
        node.status.capacity = node.status.allocatable;

        await client.replaceNodeStatus(node.metadata.name, node);
    } catch (Exception) {
        console.log(Exception);
    }
    setTimeout(() => {
        updateNode(name, rsrcClient, transition, client, keepRunning);
    }, 5000);
};

export async function Update(client: api.Core_v1Api, rsrcClient: azureResource.ResourceManagementClient, keepRunning: () => boolean) {
    try {
        let result = await client.listNode();
        let found = false;
        for (let item of result.body.items) {
            if (item.metadata.name == 'aci-connector') {
                found = true;
                break;
            }
        }
        let transition = new Date();
        let status = {
            conditions: await getConditions(rsrcClient, transition),
            nodeInfo: {
                kubeletVersion: 'v1.6.6'
            } as api.V1NodeSystemInfo
        } as api.V1NodeStatus;

        let node = {
            apiVersion: "v1",
            kind: "Node",
            metadata: {
                name: "aci-connector"
            } as api.V1ObjectMeta,
            spec: {
                taints: [
                    {
                       key: "azure.com/aci",
                       effect: "NoSchedule"
                    } as api.V1Taint
                ] as Array<api.V1Taint>
            } as api.V1NodeSpec,
            status: status
        } as api.V1Node;
        if (found) {
            console.log('found aci-connector!');
        } else {
            console.log('creating aci-connector');
            await client.createNode(node);
        }
        setTimeout(() => {
            updateNode(node.metadata.name, rsrcClient, transition, client, keepRunning);
        }, 5000);
    } catch (Exception) {
        console.log(Exception);
    }
};
