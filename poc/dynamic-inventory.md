---
title: Ansible Dynamic Inventory
description: Step by step dynamic inventory creation
published: true
---

## Information

| Project | Version | Date |
|-----------|-----------|-----------|
| [ansible](https://docs.ansible.com/)   | core 2.17.5  | 2025-08-25  |

## Context

I've recently tested the solution [semaphore-ui](./semaphore-ui.md). One issue that I encountered is that the inventory where I was applying my ansible playbook on was static. It means that , each hosts needed to be defined manually into the file `inventory.yml`. Obviously, updating each this file each time I want to deploy a new machine is a boring and repetitive task.

Instead, I want to use [Ansible Dynamic Inventory](https://docs.ansible.com/ansible/latest/inventory_guide/intro_dynamic_inventory.html#other-inventory-scripts)


> In this presentation, I will only showcase Inventory created from Hetzner Cloud API since it is the cloud provider where I deploy all my machines to perform my PoC but you can use different inventory pluggins according to your need.
You can find the list of plugins available inside their own collection, for example :

  - [Ansible EC2](https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html#ansible-collections-amazon-aws-aws-ec2-inventory)
  - [Vmware VMs](https://docs.ansible.com/ansible/latest/collections/vmware/vmware/vms_inventory.html#ansible-collections-vmware-vmware-vms-inventory)
  - [Azure RMs](https://docs.ansible.com/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html#ansible-collections-azure-azcollection-azure-rm-inventory)
  - ...
{.is-info}

## Step to Steps

In this tutorial, I will consider that you already have Ansible installed on your machine.

### Install the plugin

The first step to do is to install the collection you will need to gather your informations (for me `hetnzer.cloud`)

```shell
ansible-galaxy collection install hetzner.hcloud
```
> Alternatively, for a better CI friendly approach, you can list your collection dependencies into a `requirement.yml` file such as :

```
collections:
  - name: hetzner.hcloud
```
And install it with the command : `ansible-galaxy install -r requirements.yml`
{.is-info}

You are now ready to go !

### Create your dynamic inventory

#### Objectives

In my `hetzner` cloud , I have currently 2 machines, these are their properties :

| Name | Labels |
|-----------|-----------|
| atlantis   | `environment=prod` \n `product=atlantis` \n `team=devops`  |
| semaphore   | `environment=prod` \n `product=semaphore` \n `team=devops`  |

What I want to achieve :

- I want to list all runnings machines
- According to the labels, I want to create dynamic groups :
  - `environment_'label_environment'`
  - `product_'label_product'`
  - `team_devops`
- I want to provide a "static" configuration where the `ansible_user` must be equal to `root`
- The credentials used by ansible to query Hetzner will be an environment variable named `HCLOUD_TOKEN`

#### Configuration

My dynamic inventory looks like this :

```yaml
plugin: hetzner.hcloud.hcloud # Specify the plugins to use

api_token: "{{ lookup('env', 'HCLOUD_TOKEN') }}" # Use environment variable as credential

# Focus only on running machines
status:
  - running

# Name of the group where all information regarding machines will be stored
group: inventory

# Merge extra vars into the available variables for composition
use_extra_vars: true

# Configuration that override default behaviour of the plugins.
compose:
  ansible_host: "{{ ipv4 }}"
  image_name: "{{ image_name }}"
  # Here I specify staticly the value ansible_user for all my machines
  ansible_user: "'root'"

# Key binding between labels found and groups to create.
keyed_groups:
# For each label value found for the label "environment"
# it creates a group named environment_[value] and
# add the host inside
  - key: labels.environment
    prefix: environment
    separator: _
  - key: labels.product
    prefix: product
    separator: _
  - key: labels.team
    prefix: team
    separator: _
```

You can now create your yaml inventory with the command :

```
ansible-inventory -i ./configuration/hcloud.yml --yaml --list > dynamic_inventory.yml
```

### Result & Verification

This is the result you can expect :

```
all:
  children:
    environment_production:
      hosts:
        atlantis: {}
        semaphore: {}
    inventory:
      hosts:
        atlantis:
          ansible_host: X.X.X.X # hidden for this documentation
          ansible_user: root
          architecture: x86
          datacenter: nbg1-dc3
          id: XXXXXXXXX # hidden for this documentation
          image_id: 114690387
          image_name: debian-12
          image_os_flavor: debian
          ipv4: X.X.X.X # hidden for this documentation
          labels:
            environment: production
            product: atlantis
            team: devops
          location: nbg1
          name: atlantis
          private_networks: []
          server_type: cx22
          status: running
          type: cx22
        semaphore:
          ansible_host: X.X.X.X # hidden for this documentation
          ansible_user: root
          architecture: x86
          datacenter: nbg1-dc3
          id: XXXXXXXXXX # hidden for this documentation
          image_id: 114690387
          image_name: debian-12
          image_os_flavor: debian
          ipv4: X.X.X.X # hidden for this documentation
          labels:
            environment: production
            product: semaphore-ui
            team: devops
          location: nbg1
          name: semaphore
          private_networks: []
          server_type: cx22
          status: running
          type: cx22
    product_atlantis:
      hosts:
        atlantis: {}
    product_semaphore_ui:
      hosts:
        semaphore: {}
    team_devops:
      hosts:
        atlantis: {}
        semaphore: {}

```

We can see that the inventory had been built such as :

  - All hosts had been added to the group `inventory`
  - Other groups (such as `environment_*`, `product_*` and `team_*` reference the hosts defined in `inventory`)

Let's try it !

To test properly that my inventory works correctly , I will use ansible `ping` plugin on my groups and verify which hosts are answering.

Let's first ping the group `inventory` (group with all my hosts) :

```bash
ansible -i dynamic_inventory.yml inventory -m ping

semaphore | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3.11"
    },
    "changed": false,
    "ping": "pong"
}

atlantis | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3.11"
    },
    "changed": false,
    "ping": "pong"
}
```

I got two answers , great !

Now I only want to ping my machine with the label `product=atlantis` :

```
ansible -i dynamic_inventory.yml product_atlantis -m ping

atlantis | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3.11"
    },
    "changed": false,
    "ping": "pong"
}
```

It works as expected !

More globally these are the result of my tests (a ✅ represents a ping successfull ) :

| group | atlantis | semaphore |
|-----------|-----------|-----------|
| inventory   | ✅  | ✅  |
| product_atlantis   | ✅  | ❌  |
| product_semaphore_ui  | ❌ | ✅  |
| environment_production  | ✅ | ✅  |
| team_devops  | ✅ | ✅  |