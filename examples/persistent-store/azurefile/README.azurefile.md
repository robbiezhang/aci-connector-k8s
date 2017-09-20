# Azure Container Instance connector with Azure file share

## Creating a file share

Please follow the instructions up to step 'Acquire storage account access details' from the document '[Mounting an Azure file share with Azure Container Instances](
https://docs.microsoft.com/en-us/azure/container-instances/container-instances-mounting-azure-files-volume)',
 to create a share and note the following information:

1. storage account name
2. storage account key
3. file share name

## Create Kubernetes secret from the credentials

ACI connector utilizes kubernetes secrets to save the information required to access 
Azure file share from the container.

Please follow the steps below to create the kubernetes secret.

- Fill in the storage account name and key in [azurefile.secret.yaml](azurefile.secret.yaml)
   (Note: values needs to be base64 encoded before filling into the file)

- Run the following command:
```
kubectl create -f azurefile.secret.yaml
```
The step above will create a secret with name 'azurefilekey'. 

More information about the kubernetes secret can be found at the following [link](https://kubernetes.io/docs/concepts/configuration/secret/).


## Create the pod

Now let's get to the exciting stuff :-)

In the container specification(example provided in [busybox.azurefile.yaml](busybox.azurefile.yaml)), we need to fill in the information at two locations:

1. First is the volume mounts. This indicates where we intend the container to mount
the volume and the name of the volume. 
```
    volumeMounts:
     - name: acishare
       mountPath: "/mnt/aci/"
```

2. Second is the volume we intend to mount. In our case the volume is an azure file share.
```
  volumes:
   - name: acishare
     azureFile:
       secretName: azurefilekey
       shareName: < azure file share name>
       readOnly: false
```
Please fill the 'shareName' collected when creating the file share in Azure initially and fill in the kubernetes
secret name in 'secretName'. At this point we are ready to run the container creation command by using:
```
kubectl -f busybox.azurefile.yaml
```

A sample [DockerFile](Dockerfile) is provided for reference on how to create an busybox image which watches the mounted azure file share.

## Sample run
Here is the output from a container created using the files from the samples. We can run:
```
az container logs --name <container name> --resource-group <resource name>
```
to get the logs from the console. Here is part of the logs from the container:

```
Every 2s: ls /mnt/aci                                       

test1
test2

```
