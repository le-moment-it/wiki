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