import json
import argparse
import subprocess
import os


DEFAULT_LOCATION = "westus"
BASE_CONFIG_FILE = "example-aci-connector.yaml"

def main():
    """ Auto generate the yml file with the needed credentials"""

    parser = argparse.ArgumentParser(
        description='''Automatically generate the connector yaml file with the needed credentials. Either create a resource 
        REQUIREMENTS:
        1) Azure CLI is installed
        2) The desired subscription Id is set as current in the CLI or is provided with the -s flag''')
    
    parser.add_argument(
        "-cr",
        "--create-group",
        action='store_true',
        help="Creates a resource group. Must provide resource group name with (-g) and location (-l)"
    )
    parser.add_argument("-g", "--resource-group", help="Name of resource group", required=True)
    parser.add_argument("-s", "--subscription-id", help="Subscription ID")
    parser.add_argument("-l", "--location", help="Resource Location")
    parser.add_argument("-f", "--file", help="filename for the output file")
    
    args = parser.parse_args()

    if not os.path.isfile(BASE_CONFIG_FILE):
        print("Could not find base configuration file: ", BASE_CONFIG_FILE)

    resource_group = args.resource_group

    if (args.create_group):
        
        print("Creating Resource Group ", resource_group)

        if (args.location):
            location = args.location
        else:
            print("Using defalut location: " + DEFAULT_LOCATION)
            location = DEFAULT_LOCATION

        response = json.loads(
            subprocess.check_output(
                "az group create -n " + resource_group + " -l " + location,
                shell=True
            ))

        if(response['properties']['provisioningState'] != 'Succeeded'):
            print("An Error occured while creating the resource group: ", resource_group)
            exit(-1)

        subscription_id = response['id'].split('/')[2]

    else:   
        resource_group = args.resource_group
        if(resource_group == None):
            print("Must provide a resource group name")
            exit(-1)

        subscription_id = args.subscription_id
        if(subscription_id == None):
            print("Must provide a subscription Id unless you create a new resource group")
            exit(-1)

    print("Creating Service Principal")
    app_info = json.loads(
        subprocess.check_output(
            "az ad sp create-for-rbac --role=Contributor --scopes /subscriptions/" + subscription_id + "/",
            shell=True
        ).decode("utf-8")
    )

    try:
        replacements = {
            "<CLIENT_ID>": app_info['appId'],
            "<CLIENT_KEY>": app_info['password'],
            "<TENANT_ID>": app_info['tenant'],
            "<SUBSCRIPTION_ID>": subscription_id,
            "<RESOURCE_GROUP>": resource_group
        }
    except:
        print("Unable to create a service principal")
        exit(-1)

    with open('example-aci-connector.yaml', 'r') as file:
        filedata = file.read()

    for key, value in replacements.items():
        filedata = filedata.replace(key, value)

    filename = args.file
    if (filename == None):
        filename = "aci-connector.yaml"

    with open(filename, 'w') as file:
        file.write(filedata)

if __name__ == '__main__':
    main()
