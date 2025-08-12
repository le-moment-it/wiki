---
title: Semaphore-UI
description: Semaphore test & review
published: true
---

## Information

| Project | Version | Date |
|-----------|-----------|-----------|
| [semaphore-ui](https://semaphoreui.com/)   | v2.15.0  | 2025-08-20  |

## Context

Terraform and Ansible are, by far, the most popular tools for infrastructure as code. Typically, Terraform is used to deploy infrastructure on private or public cloud platforms, while Ansible is used to manage configurations. However, even when both tools are used within the same organization, their workflows are completely separated. There is no popular tool that manages both Ansible and Terraform in a unified manner.

This is why I wanted to test [semaphore-ui](https://semaphoreui.com/). This tool enables the deployment of various tasks, including both Ansible and Terraform workflows.

In this review, I will present the results of my testing. We will explore together all the interesting features offered by this tool.

> In this presentation, I will only showcase features available in the **Open Source** and **Free** version of semaphore-ui. For more information about the paid license, please refer to their [licensing page](https://semaphoreui.com/pro)
{.is-info}

## Workflow

`Semaphore-ui` has been designed to be a `GitOps` tool. This means that every task, script, or code you execute will always be stored in a Git repository. Before each execution, `semaphore-ui` will pull the repository, locate the file you've defined in the task template, and execute it.

For example, for an Ansible playbook (using SSH), the workflow would look like this:

```plantuml
Git<-Semaphore : Pull repository
Semaphore->Server : 22 SSH
```

## Feature Landscape

### Projects & Overview

The first step when working with `semaphore-ui` is creating a `project`. A project serves as the workspace where all activities take place. A single project encompasses the following features:

- **Dashboard**: A view where you can see the history of executed tasks along with their status
- [**Task templates**](#task-templates): The heart of `semaphore-ui`, where you define the tasks you will be able to launch. At the time I am writing this review, these are the available task templates:
  - Terraform
  - OpenTofu
  - Terragrunt
  - Ansible
  - Bash script
  - PowerShell (only if you enable this feature)

- **Inventory**: List of devices that you want to manage
- [**Variables Groups**](#variable-groups): Sets of `variables`, `environment variables`, and `secrets` that you can provide to your task templates
- **Key Store**: Storage for SSH keys or HTTP authentication credentials. Necessary for pulling private repositories or connecting to servers using SSH authentication
- **Repositories**: List of repositories to synchronize (will be detailed later)
- [**Integrations**](#integrations): Where you can create webhook URLs to trigger your task templates from other platforms

![Overview](/assets/poc/semaphore-ui/overview.png =100%x)

### Task Templates

Different types of `task templates` exist, but to illustrate, let's use the `ansible task templates` as an example.

This is what it looks like for my example repository:

#### Tabs {.tabset}
##### Configuration
![Task-Template](/assets/poc/semaphore-ui/task-template.png =100%x)
##### Repository
```
├── configuration
│   ├── inventory.yml
│   ├── main.yml
│   ├── provisioning.yml
│   └── templates
│       └── docker-compose.yml.tpl
├── infrastructure
│   ├── backend.tf
│   ├── data.tf
│   ├── provider.tf
│   ├── server.tf
│   └── variables.tf
```
#### 

Let's examine the most important features:

- **Path to playbook file**: This is where you define which `playbook` you want to run. This `playbook` is located inside the repository chosen in the `Repository` section. The `Repository` credentials are configured within its dedicated configuration (in the `Repositories` section).
- **Inventory**: Ansible inventory. This inventory can be located inside the pulled repository or statically defined within `semaphore`
- **Variable Group**: Sets of `variables`, `environment variables`, and `secrets` that you can provide to your task templates. This will be explained in its dedicated section
- **View**: This is an amazing and remarkably simple feature. It allows you to organize your executed tasks into different tabs. This slightly improves the visibility of your executed tasks. In this example, I chose the view `Database`, so my task template will appear **only** in this tab.
![View](/assets/poc/semaphore-ui/view.png =50%x)

The rest of the configuration focuses on how `Ansible` works and will vary for different types of tasks.

After configuring your task template, you can execute it. This is how the output looks:

![Output](/assets/poc/semaphore-ui/output.png =75%x)

### Variable Groups

`Variable Groups` is a self-explanatory name, but I would like to focus on this topic to clearly explain its capabilities. This is what it looks like:

![Output](/assets/poc/semaphore-ui/variable-group.png =100%x)

The `variable group` is divided into two sections:

  - `Variables`: Non-secret values
  - `Secrets`: Secret values

For both categories, you can define two types of variables:

  - `Extra variables`: These variables **are added to the launch command of your task**. This can be useful when you need a specific set of settings for a particular task template.
  - `Environment variables`: These variables are added as environment variables within the task. This can be quite handy for providing credentials to your tasks (such as cloud credentials).

> During my tests, I encountered some issues where updating my `variable groups` would create a new `Key Store` with my secret values instead of updating the existing `variable groups`. I was unable to reproduce this issue consistently, but it was worth noting.
{.is-warning}

### Integrations

`Integrations` are webhooks that you can call to trigger task templates. This allows you to integrate task execution into your CI/CD pipeline. This is how you configure them:

![Output](/assets/poc/semaphore-ui/integration.png =50%x)

After creating an `integration`, you can create `aliases` (URLs) to trigger your jobs. For example, my integrations will be available at the URL:

```
https://mysemaphore.example.com/api/integrations/czep2z24okm8x2jb
```

You can also extract data from either the `header` or `body` of your HTTP request to provide data to your `task template`.

## My Opinion

In this final section, I will provide my honest opinion about this tool.

### Advantages & Disadvantages 

#### Tabs {.tabset}
##### ✅ Advantages
- **Installation & Maintenance**: I really enjoyed setting up and configuring my `semaphore-ui` instance. This tool is easy to install and will be straightforward to update and maintain.

- **Deploying Ansible workflows**: Deploying Ansible playbooks using `semaphore-ui` is very convenient. I won't lie—it resembles `Ansible AWX` significantly. The workflows are similar, the vocabulary is similar, and as an IT engineer, the experience is comparable. I particularly appreciated the `Variable Groups` that add an excellent layer of flexibility to the tool. I would highly recommend this tool for any IT department that needs to manage infrastructure with Ansible.

- **Overall UI/UX**: The tool is very user-friendly. You can easily provide this tool to level 1 support staff who could handle daily operational tasks (restarting a server, providing access, etc.) while your IT engineering team prepares new playbooks to support your next automation initiatives.

- **Enterprise readiness**: I didn't test these features, but `Semaphore` is compatible with `OIDC` authentication systems, which provides seamless credential integration within your company infrastructure.

##### ❌ Disadvantages

- **Deploying Terraform workflows**: During my tests, I deployed only `vanilla` Terraform. By `vanilla`, I mean that I didn't use any tools or frameworks to wrap my Terraform code. In my experience, I have used [Terraspace](https://terraspace.cloud/) extensively and more recently, I am testing [Atmos](https://atmos.tools/) and [Terramate](https://terramate.io/docs/). These tools won't be compatible with `semaphore-ui`. Moreover, `semaphore-ui` won't be compatible neither with excellent tools such as [Atlantis](https://www.runatlantis.io/) and may limit your possibilities when you want to add more features to your Terraform deployment workflows (OPA verification, Infracost, etc.). However, for deploying only `vanilla` Terraform, `semaphore-ui` will definitely meet your needs.

### Is `Semaphore-UI` Recommended?

I would definitely recommend using `semaphore-ui` if your company is in one of the following situations:

- You are looking for a tool that can enhance your Infrastructure as Code workflows and deploy `Ansible` or vanilla `Terraform` for small or large infrastructure using GitOps practices.

- You are looking for a tool where you can easily track changes performed on your infrastructure.

- You are looking for a tool where you can grant specific permissions to your Level 1 Support team to perform daily operational tasks while your IT Engineers can focus on improving your infrastructure.