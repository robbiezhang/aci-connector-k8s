import api = require('@kubernetes/typescript-node');
import aci = require('./aci');

import azureResource = require('azure-arm-resource');

export async function ContainerCreator(client: api.Core_v1Api, startDate: Date, rsrcClient: azureResource.ResourceManagementClient, keepRunning: () => boolean) {
    console.log('k8s pod creater/updater');
    try {
        if (!keepRunning()) {
		return;
	}
        let groups = await aci.ListContainerGroups(rsrcClient);

        for (let containerGroup of groups) {
            console.log(containerGroup['name']);
            if (!containerGroup['tags'] || containerGroup['tags']['orchestrator'] != 'kubernetes') {
                continue;
            }
            let pod: api.V1Pod = null;
            try {
                let response = await client.readNamespacedPod(containerGroup['name'], "default");
                if (response && response.body) {
                    pod = response.body as api.V1Pod;
                }
            } catch (Exception) {
	        // TODO: look for 404 here?
                console.log(Exception);
                continue;
            }

            let podPhase = null;
            if ( containerGroup['properties']['provisioningState'] == 'Succeeded') {
                podPhase = 'Running';
            } else if ( containerGroup['properties']['provisioningState'] == 'Creating') {
                podPhase = 'ContainerCreating';
            } else if ( containerGroup['properties']['provisioningState'] == 'Failed') {
                podPhase = 'Error';
            } else {
                podPhase = 'Unknown';
            }

            if (!pod)
                continue;

            pod.status.podIP = containerGroup['properties']['ipAddress'] ? containerGroup['properties']['ipAddress']['ip'] : null;
            pod.status.phase = podPhase;
            pod.status.startTime = startDate;
            pod.status.conditions = [
                {
                    lastTransitionTime: startDate,
                    status: "True",
                    type: "Initialized"
                } as api.V1PodCondition,
                {
                    lastTransitionTime: startDate,
                    status: "True",
                    type: "PodScheduled"
                } as api.V1PodCondition,
                {
                    lastTransitionTime: startDate,
                    status: "True",
                    type: "Ready"
                } as api.V1PodCondition
            ] as Array<api.V1PodCondition>

            let containers = new Array<api.V1Container>();
            let containerStatuses = new Array<api.V1ContainerStatus>();
            for (let container of containerGroup['properties']['containers']) {
                containers.push(
                    {
                        name: container['name'],
                        image: container['properties']['image']
                    } as api.V1Container
                );
                containerStatuses.push(
                    {
                        name: container['name'],
                        image: container['properties']['image'],
                        ready: true,
                        state: {
                            running: {
                                startedAt: startDate
                            } as api.V1ContainerStateRunning
                        } as api.V1ContainerState
                    } as api.V1ContainerStatus
                );
            }
            
            pod.spec.containers = containers;
            pod.status.containerStatuses = containerStatuses;
            
            try {
                await client.replaceNamespacedPodStatus(pod.metadata.name, "default", pod);
            } catch (Exception) {
                console.log(Exception);
            }
        }
    } catch (Exception) {
        console.log(Exception);
    }
    setTimeout(() => {
        ContainerCreator(client, startDate, rsrcClient, keepRunning);
    }, 5000);
}
