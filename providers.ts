import azureResource = require('azure-arm-resource');
import rest = require('ms-rest');

export async function getProvider(client: azureResource.ResourceManagementClient): Promise<Object> {
    let promise = new Promise((resolve, reject) => {
        client.providers.get("Microsoft.ContainerInstance", function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    return promise;
}
