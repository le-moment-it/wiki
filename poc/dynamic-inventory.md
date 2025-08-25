---
title: Ansible Dynamic Inventory
description: Step-by-step dynamic inventory creation
published: true
---

# Information

| Project | Version | Date |
|-----------|-----------|-----------|
| [ansible](https://docs.ansible.com/)   | core 2.17.5  | 2025-08-25  |

# Context

I recently tested the [semaphore-ui](./semaphore-ui.md) solution. One issue I encountered was that the inventory where I was applying my Ansible playbook was static. This means that each host needed to be defined manually in the `inventory.yml` file. Obviously, updating this file every time I want to deploy a new machine is a tedious and repetitive task.

Instead, I want to use [Ansible Dynamic Inventory](https://docs.ansible.com/ansible/latest/inventory_guide/intro_dynamic_inventory.html#other-inventory-scripts).

> In this guide, I will only demonstrate inventory creation from the Hetzner Cloud API since it is the cloud provider where I deploy all my machines to perform my proof of concept (PoC). However, you can use different inventory plugins according to your needs.
You can find the list of available plugins within their respective collections, for example :  [Ansible EC2](https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html#ansible-collections-amazon-aws-aws-ec2-inventory) , [VMware VMs](https://docs.ansible.com/ansible/latest/collections/vmware/vmware/vms_inventory.html#ansible-collections-vmware-vmware-vms-inventory) , [Azure RMs](https://docs.ansible.com/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html#ansible-collections-azure-azcollection-azure-rm-inventory)
{.is-info}

# Step-by-Step Guide

In this tutorial, I assume that you already have Ansible installed on your machine.

## Install the Plugin

The first step is to install the collection you need to gather your information (in my case, [hetzner.hcloud](https://docs.ansible.com/ansible/latest/collections/hetzner/hcloud/hcloud_inventory.html#ansible-collections-hetzner-hcloud-hcloud-inventory)):

```shell
ansible-galaxy collection install hetzner.hcloud
```

> Alternatively, for a more CI-friendly approach, you can list your collection dependencies in a `requirements.yml` file like this:
```yaml
collections:
  - name: hetzner.hcloud
```
And install it with the command: `ansible-galaxy install -r requirements.yml`
{.is-info}

You are now ready to proceed!

## Create Your Dynamic Inventory

### Objectives

In my Hetzner cloud, I currently have 2 machines with the following properties:

| Name | Labels |
|-----------|-----------|
| atlantis   | `environment=prod` <br> `product=atlantis` <br> `team=devops`  |
| semaphore   | `environment=prod` <br> `product=semaphore` <br> `team=devops`  |

What I want to achieve:

- List all running machines
- Create dynamic groups based on labels:
  - `environment_'label_environment'`
  - `product_'label_product'`
  - `team_devops`
- Provide a "static" configuration where `ansible_user` is set to `root`
- Use credentials from an environment variable named `HCLOUD_TOKEN` for querying Hetzner

### Configuration

My dynamic inventory configuration looks like this:

```yaml
plugin: hetzner.hcloud.hcloud # Specify the plugin to use

api_token: "{{ lookup('env', 'HCLOUD_TOKEN') }}" # Use environment variable as credential

# Focus only on running machines
status:
  - running

# Name of the group where all machine information will be stored
group: inventory

# Merge extra variables into the available variables for composition
use_extra_vars: true

# Configuration that overrides default plugin behavior
compose:
  ansible_host: "{{ ipv4 }}"
  image_name: "{{ image_name }}"
  # Here I specify the ansible_user value statically for all my machines
  ansible_user: "'root'"

# Key binding between labels found and groups to create
keyed_groups:
# For each label value found for the "environment" label,
# it creates a group named environment_[value] and
# adds the host inside
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

You can now create your YAML inventory with the command:

```shell
ansible-inventory -i ./configuration/hcloud.yml --yaml --list > dynamic_inventory.yml
```

## Result & Verification

This is the result you can expect:

```yaml
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

We can see that the inventory has been built as follows:

  - All hosts have been added to the `inventory` group
  - Other groups (such as `environment_*`, `product_*`, and `team_*`) reference the hosts defined in `inventory`

Let's test it!

To properly test that my inventory works correctly, I will use the Ansible `ping` module on my groups and verify which hosts are responding.

Let's first ping the `inventory` group (group with all my hosts):

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

I received two responses—excellent!

Now I only want to ping my machine with the label `product=atlantis`:

```bash
ansible -i dynamic_inventory.yml product_atlantis -m ping

atlantis | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3.11"
    },
    "changed": false,
    "ping": "pong"
}
```

It works as expected!

Overall, these are the results of my tests (a ✅ represents a successful ping):

| group | atlantis | semaphore |
|-----------|-----------|-----------|
| inventory   | ✅  | ✅  |
| product_atlantis   | ✅  | ❌  |
| product_semaphore_ui  | ❌ | ✅  |
| environment_production  | ✅ | ✅  |
| team_devops  | ✅ | ✅  |

# Conclusion & Next Steps

With this dynamic inventory configured, I can dynamically update my inventory and call the created groups with Ansible playbooks to configure my servers. Moreover, by creating a job in my CI/CD pipeline to automatically update my inventory file, when I use [semaphore-ui](./semaphore-ui.md) to apply Ansible tasks, I can ensure that my inventory will always be up to date.