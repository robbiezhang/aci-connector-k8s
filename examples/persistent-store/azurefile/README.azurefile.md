# Using Azure Container Instance connector with Azure files

## Creating a file share

Please follow the instructions upto the steps Acquire storage account access details from the following [link](
https://docs.microsoft.com/en-us/azure/container-instances/container-instances-mounting-azure-files-volume)
to create a share and note the information regarding

1. storage account name
2. strage account key
3. file share name

## Create Kubernetes secret from the credentials

The aci connector support for azure file utilizes the kubernetes secrets to save the information regarding the
3 items required to access the share from the container.

Please follow the steps below to create the kubernetes secret.

- Fill in the storage account name and key in azurefile.secret.yaml
   (Note: that values needs to be base64 encoded before filling into the file)


- Run the following command:
```
kubectl create -f azurefile.secret.yaml
```

The step above will create a secret with name 'azurefilekey'. This secret will be used by the aci connector when creating the container.
More information about the kubernetes secret can be found at the following [link](https://kubernetes.io/docs/concepts/configuration/secret/).


## Create the pod

Now lets get to the exciting stuff :-)

In the container specifications (example provided in busybox.azurefile.yaml), we need to the fill information into two locations:

1. First one is the information regarding the volume mounts. This indicates where we intend the container to mount
the volume and the name of the volume. In our case the volume is an azure file share.

```
    volumeMounts:
     - name: acishare
       mountPath: "/mnt/aci/"
```

2. We need to fill in information regarding the volume we intend to mount.

```
  volumes:
   - name: acishare
     azureFile:
       secretName: azurefilekey
       shareName: < azure file share name>
       readOnly: false
```

Please fill the 'shareName which we collected when we created the file share in azure initially and fill in the kubernetes
secret name in 'secretName'. At this point we are ready to run the container creation command by using:
```
kubectl -f busybox.azurefile.yaml
```

Example container spec can be found in busybox.azurefile.yaml. Sample docker file is provided with the samples for reference on
how to create an busybox image which watches the mounted azure file share.


## Sample run
Here is the sample output from a container created using the files from the samples. We can run:
```
az container logs --name <container name> --resource-name <resource name>
```

get the logs from the console.

```


```
