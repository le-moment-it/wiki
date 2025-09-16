---
title: Atmos
description: A Modern Composable YAML-Based Framework
published: true
---

# Information

| Project | Version | Date |
| :-- | :-- | :-- |
| [atmos](https://atmos.tools/) | 1.187.0 | 2025-08-26 |

> In this article, I will share my opinion and experience regarding how Terraform/OpenTofu infrastructure should be maintained and evaluate what makes a wrapper tool effective. If you disagree with my perspective, feel free to reach out so we can discuss and share our opinions and experiences about these tools we love to use ♥️
{.is-warning}

# Context

Terraform (\& OpenTofu) have, by far, become the standard for deploying cloud infrastructure. I have personally used Terraform since 2019 and have accumulated substantial experience with these tools. I quickly understood that Terraform would become easier to maintain and scale if I could wrap it with another tool to keep the infrastructure DRY (Don't Repeat Yourself).

The first popular tool at the time was [Terragrunt](https://terragrunt.gruntwork.io/). However, after extensive testing, I frequently concluded that `Terragrunt` was very tedious to use and maintain. It requires creating too many files across numerous folders without adequately addressing the tool's main purpose: keeping infrastructure DRY.

In 2021, I discovered [Terraspace](https://terraspace.cloud/), and I immediately found this tool promising. I will explain why in the next section: [Wrapper requirements](#wrapper-requirements).

However, in 2025, I have increasing doubts about whether `Terraspace` will be maintained long-term. More and more GitHub `issues` require updates that developers from the `boltops` company cannot provide due to business priorities.

That's why, even though I work extensively with `Terraspace`, I now need to evaluate which tools are available on the market to manage Terraform code efficiently. Among all solutions, I've retained the following ones:

- [Atmos](https://atmos.tools/): A modern composable framework for tools such as Terraform, OpenTofu, Packer, and Helmfile. This is the tool I will present in this article.
- [Terramate](https://terramate.io/docs/): Another tool for deploying and managing Terraform code
- [Terragrunt](https://terragrunt.gruntwork.io/): The historical Terraform wrapper. Even though I've already tested this solution multiple times, I plan to test it again because the `Gruntwork` team has implemented some very interesting features explained here: [Road to Terragrunt 1.0](https://www.gruntwork.io/blog/the-road-to-terragrunt-1-0-stacks)


# Wrapper Requirements

> What makes a tool a **good wrapper** for Terraform or OpenTofu?

**That's the eternal question**. I could (and will) write an entire article about managing **Infrastructure as Code** repositories. However, I will try to remain concise in this section and focus only on Terraform/OpenTofu-related repositories.

## Must Be `Stack` Focused

Compared to other programming languages, HCL (Terraform language) is relatively easy to learn and read. However, when we start creating larger infrastructure, the number of code lines increases significantly, and it becomes harder to maintain. That's why we created Terraform modules—reusable pieces of code where a simple module call can deploy multiple resources. But if we look at one of the most popular modules, [AWS VPC Terraform Module](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest), we can see that implementing this module and adding other modules on top of it can become tedious to maintain when we need to deploy multiple environments, in multiple regions for multiple teams, etc.

Even though I've never read an article about it, a **need for `stack` abstraction has emerged**.

A `stack` is a group of one or multiple **`indivisible`** pieces of infrastructure that are intended to work together. From now on, I will call these pieces **`components`**.

For example, if I wanted to create a `stack` to deploy a new `instance`, this `stack` might be a combination of the following `components`:

- [network](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/network): Network where the instance will be deployed
- [subnet](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/network_subnet): Definition of the `subnets` inside the `network`
- [instance](https://registry.terraform.io/modules/terraform-hetzner-modules/server/hetzner/latest): The actual instance

Increasingly, all Infrastructure as Code tools tend to become more `stack`-focused. Among many examples, we can find: 👇

### Stack Examples {.tabset}

#### Atmos

In `Atmos`, a `component` is called a **component** or **Terraform "root" module**. It is an independent piece of Terraform code where we define what our component will deploy. An example can be:

```hcl
resource "hcloud_network" "this" {
  name     = "network-${var.environment}"
  ip_range = var.ip_range
}
```

Then a `stack` will be a **collection** of `components` defined in a **YAML file**. In this example, two components `network` \& `instance` are deployed in the stack:

```yaml
components:
  terraform:
    network:
      metadata:
        component: network
    instance:
      metadata:
        component: instance
```

**More details about stacks in the next sections of this documentation 🧑‍💻**

#### Terraspace

In Terraspace, a `stack` is called a `stack`. It allows you to define a piece of Terraform code that can be deployed separately from other stacks. Moreover, you can define dependencies between stacks to deploy them in the correct order if needed. This is an example of stack definition:

```bash
$ terraspace new stack demo
=> Creating new stack called demo.
      create  app/stacks/demo
      create  app/stacks/demo/main.tf
      create  app/stacks/demo/outputs.tf
      create  app/stacks/demo/variables.tf
You can use 'terraspace new module' to create a starter module structure.
```


#### Terramate

> I haven't had the opportunity to try `Terramate` yet.
{.is-warning}

In Terramate, a `stack` is called a `stack`. It allows you to define a piece of Terraform code that can be deployed separately from other stacks. Moreover, you can define dependencies between stacks to deploy them in the correct order if needed. This is an example of stack definition:

```hcl
# ./stacks/vpc/stack.tm.hcl
stack {
  name        = "Main VPC"
  description = "Stack to manage the main VPC"
  id          = "3271f37c-0e08-4b59-b205-1ee61082ff26"
}
```


#### Terragrunt

> I haven't had the chance to test `Terragrunt` `units` \& `stacks` yet.
{.is-warning}

In its [Road to Terragrunt 1.0](https://www.gruntwork.io/blog/the-road-to-terragrunt-1-0-stacks), [Terragrunt](https://terragrunt.gruntwork.io/) announced two important new features:

- `units`: Abstraction layer on top of module instantiation. It forces you to define inputs to modules and extract outputs.
- `stacks`: Construct for provisioning one or more `units`. Within the same `stack`, `units` can pass data to each other and be provisioned and de-provisioned in proper order.

```hcl
# live/example-stack/terragrunt.stack.hcl
unit "first_null" {
  source = "${get_repo_root()}/units/null-with-message"
  path   = "first-null"
}
unit "second_null" {
  source = "${get_repo_root()}/units/null-with-message"
  path   = "second-null"
}
```


#### Terraform (BETA)

[Terraform](https://developer.hashicorp.com/terraform) itself has introduced a stack system where you can define multiple `components` within a `stack`:

```hcl
# components.tfstack.hcl
component "s3" {
    for_each = var.regions
    source = "./s3"
    inputs = {
        region = each.value
    }
    providers = {
        aws    = provider.aws.configurations[each.value]
        random = provider.random.this
    }
}
```

Then an instantiation of this stack is defined by a `deployment`:

```hcl
# deployments.tfdeploy.hcl
deployment "production" {
    inputs = {
        aws_region     = "us-west-1"
        instance_count = 2
    }
}
```


### Stack Requirements

Stacks are an abstraction layer built on top of components, which themselves are often abstractions over Terraform modules.

To ensure these abstraction layers remain efficient, they need to be **environment-agnostic**. This means your stacks must be deployable regardless of the environment (`prod`, `staging`, etc.) as well as other variable values that define the deployment context (for example: region, location, size, etc.).

#### Stack Examples {.tabset}

##### Environment-Agnostic

This is an example of an **environment-agnostic** network:

```hcl
resource "hcloud_network" "this" {
  name     = "network-${var.environment}"
  ip_range = var.ip_range
}
```


##### Non-Environment-Agnostic

This is an example of a **non-environment-agnostic** network:

```hcl
resource "hcloud_network" "this" {
  name     = "mynetwork"
  ip_range = var.ip_range
}
```


## Must Be `Mono-Repository` Capable

Another question we often see on the internet is how to organize Terraform repositories. Should I create separate repositories per service, per department, or keep everything in the same repository? Obviously, there is no single correct answer to this question, but here is my opinion on the topic.

**A single repository** (or maybe 2 according to your organization) **per department** should be sufficient to manage the deployment of infrastructure managed by that same department.

Too many repositories often lead to too many actions (and merge requests) to perform a single update. Moreover, when you use too many repositories, you might miss opportunities to centralize the management of your infrastructure.

That's why I highly recommend using `mono-repositories`. Mono-repositories bring the best of both worlds between `monolith` and `micro-services` repositories (vocabulary often used for software development). With `mono-repositories`, you will be able to centralize the management of your code (more details in [Must provide a `centralized` experience](#must-provide-a-centralized-experience)) and easily track changes in your infrastructure.

> `Mono-repository` **does not mean** `monolith` because within the same mono-repository, you will be able to deploy multiple infrastructure components that **do not depend on each other**. For example, you can use different Terraform `workspaces` or more simply different terraform state names according to your needs.
{.is-success}

Within your `mono-repository`, you will be able to develop your stacks, **but also the instantiation of these stacks** using context variables (environment, location, etc.). Sometimes, these context variables are called `layers`.

Having a well-thought `mono-repository` structure is **crucial** and must be **carefully considered** by your organization before implementing it.

Fortunately, tools such as `Atmos`, `Terragrunt`, and `Terraspace` suggest (and sometimes force) you to follow a specific `mono-repository` structure to ensure that the tool can correctly parse the configurations. However, your `mono-repository` must answer **your needs** and **your practices**.

## Must Be `Configuration as Code` Friendly

As I mentioned in [Must be `mono-repository` capable](#must-be-mono-repository-capable), having a `mono-repository` that fits your organization's needs is crucial. That's why having a tool flexible enough to answer all possible needs is important. To achieve this, the tool needs to be configurable **with code**. And of course, this code **must** be in the mono-repository where the tool will be launched. With a single read of the configuration files, you should be able to understand how the `mono-repository` works and be ready to use it.

Having highly configurable capabilities makes a big difference between a good tool and a great tool. Let's see some examples:

### Configurable Tools {.tabset}

#### Terraspace

Terraspace `mono-repository` includes a dedicated `config` folder where you can [configure various aspects](https://terraspace.cloud/docs/config/reference/):

```ruby
Terraspace.configure do |config|
  config.logger.level = :info
  config.test_framework = "rspec"
end
```


#### Atmos

The Atmos CLI must have an `atmos.yaml` file to know how to interact with the [various tools and configurations it manages](https://atmos.tools/cli/configuration/#configuration-file-atmosyaml):

```yaml
base_path: "./"
components:
  terraform:
    command: "tofu"
    base_path: "components/terraform"
... 
stacks:
  base_path: "stacks"
  included_paths:
    - "orgs/**/*"
...
logs:
  file: "/dev/stderr"
  level: Info
```


## Must Provide a `Centralized` Experience

The last but not least important requirement for having a great wrapper is its capacity to `centralize` actions that you can perform within the repository.

Let's take some examples from development practices: 👇

### Development Practices {.tabset}

#### Node.js

Node.js developers use their `package.json` to wrap long and tedious commands and easily call them with commands such as:

```bash
npm run <command>
```

A `package.json` could look like:

```json
{
  "scripts": {
    "test": "shell=$(basename -- $(ps -o comm= $(ps -o ppid= -p $PPID)) | sed 's/^-//'); make test-$shell",
    "markdown-link-check": "git ls-files | command grep -E '\.md$' | xargs -n 1 markdown-link-check -p"
  }
}
```


#### PHP Composer

Composer developers use their `composer.json` to wrap long and tedious commands and easily call them with commands such as:

```bash
composer run-script
```

A `composer.json` could look like:

```json
{
    "scripts": {
        "post-update-cmd": "MyVendor\\MyClass::postUpdate"
    }
}
```

As a DevOps engineer, when I choose the tool that I will interact with during my entire development experience, I want the exact same seamless experience that developers have when they develop their applications.

That's why I want to interact with a **single CLI** that will automatically perform actions according to the arguments I provide to it. This single CLI will bring the `centralized` experience that I am looking for.

Finally, having this single CLI interaction will slightly help develop and debug the CI/CD that will then perform actions for you after each of your commits or merged merge requests.

# Atmos

After defining what makes a great Terraform wrapper in the previous section, let's dive into [Atmos](https://atmos.tools/).

## Stacks \& Components

According to its documentation, Atmos is a "cloud architecture framework for native Terraform". It provides a simple way to build `components` and `stacks` that you can deploy to build your infrastructure:

- `components`: Also called `Terraform "root" modules`, this is the "actual" code that will be deployed by Terraform.
- `stacks`: **YAML** definition of `components` to deploy.

> I won't lie when I say that I was skeptical when I first saw YAML code to instantiate Terraform modules. But at the end of the day, using the HCL configuration language or YAML achieves the same result:

### Example {.tabset}

#### HCL

```hcl
module "vpc" {
  source = "./vpc"
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```


#### YAML - Atmos

```yaml
    vpc:
      metadata:
        component: vpc
      vars:
        name: "my-vpc"
        cidr: "10.0.0.0/16"
```


### Component Dependencies

As I mentioned in [Must be `stack` focused](#must-be-stack-focused), `components` have dependencies, and Atmos allows you to easily define them within your stack definition.

For example, if you want your component `instance` to depend on `network`:

```yaml
components:
  terraform:
    network:
      metadata:
        component: network
    instance:
      settings:
        depends_on: ## Dependency definition
          1:
            component: network
      metadata:
        component: instance
```

Moreover, if you need an output value from the `network` component as an input for the `instance` component:

```yaml
components:
  terraform:
    network:
      metadata:
        component: network
    instance:
      settings:
        depends_on:
          1:
            component: network
      metadata:
        component: instance
      vars:
        # We take the output network_id from the network component as input variable network_id
        # for the instance component.
        # Everything defined after the // is a mocking value that we provide to test
        # the component code
        network_id: !terraform.output network "network_id // \"123\""
        public_subnet_ip_range: !terraform.output network "public_subnet_ip_range // \"10.0.1.0/24\""
```


### Atmos CLI

One of the most powerful aspects of `atmos` is its CLI. The `atmos` CLI provides all the information needed to debug the configuration of your `components` and `stacks`. With a single `atmos describe component <component>` command, you will see the full YAML configuration ([ref](https://atmos.tools/core-concepts/describe/component)):

```yaml
atmos_cli_config:
  base_path: ./
  components:
    terraform:
      base_path: components/terraform
....
atmos_component: instance
atmos_manifest: orgs/dev/infrastructure
atmos_stack: dev
atmos_stack_file: orgs/dev/infrastructure
...
imports:
  - layers/infrastructure
  - mixins/global/backends/gitlab.yaml
  - mixins/global/providers/hetzner-cloud
  - mixins/global/schemas/environment
  - mixins/locations/ngb1
  - orgs/dev/_defaults
```

All these values provide all the information you need to understand what is under the hood of the atmos component. They are also a great source of information for variables to use when creating templates.

### Templates

Your atmos `mono-repository` will contain different contexts:

- `environment`: You can have multiple environments such as `prod`, `stage`, or `dev`
- `location`: You may need to deploy in multiple regions available with your cloud providers
- ...

Since you want to deploy stacks, you may want to use these context values as inputs for your stacks. Atmos allows you to **template** your YAML files using [Go Templates](https://pkg.go.dev/text/template). This is incredibly powerful because it allows you to have full control of your `stack` definition according to context values.

A very simple implementation of this:

```yaml
terraform:
  backend_type: http
  backend:
    http:
      # The terraform state backend name file is dynamically built using the name of the stack, the location, and the name of the component
      # By using this system, we can ensure that no backend name conflicts can happen. Moreover, it is easy to find the backend needed if we
      # are looking for it.
      address: "https://gitlab.com/api/v4/projects/XXXXXXX/terraform/state/{{ .atmos_stack }}-{{ .env.LOCATION }}-{{ .atmos_component }}"
      lock_address: "https://gitlab.com/api/v4/projects/XXXXXXX/terraform/state/{{ .atmos_stack }}-{{ .env.LOCATION }}-{{ .atmos_component }}/lock"
      unlock_address: "https://gitlab.com/api/v4/projects/XXXXXXX/terraform/state/{{ .atmos_stack }}-{{ .env.LOCATION }}-{{ .atmos_component }}/lock"
      lock_method: "POST"
      unlock_method: "DELETE"
      retry_wait_min: 5
```

Having a templating system integrated within your `mono-repository` will significantly enhance your configuration management. Moreover, since in Atmos, **everything** is a YAML configuration, this templating system will also enhance your workflow possibilities.

### Imports

The final and most important feature of `atmos`: `imports`.

The [`imports`](https://atmos.tools/core-concepts/stacks/imports/) mechanism is simply the merging of two or more YAML files. To import any stack configuration from your mono-repository, you can use the keyword `import`:

```yaml
import:
  - layers/infrastructure
```

If you import a stack configuration that is also a template, the values **will be changed according to your context**.

> Why are `imports` so powerful?

It is difficult to explain how this `import` mechanism significantly improves configuration management, but I will give it a try. **Please consider that this is my own opinion**.

Some tools such as `Terragrunt` force you to use a "vertical" context variable definition, meaning that at any folder in your file tree, you need a `<file>.hcl` where you define your context variables. In contrast, Atmos has more of a "horizontal" approach where you simply define what you want to import using the simple keyword `import`:

#### Import Approaches {.tabset}

##### Vertical

This is what `Terragrunt` "vertical" context looks like:

```
project-root/
│
├── terragrunt.hcl
│
├── _env/                    
│   ├── vpc.hcl
│   └── instance.hcl
├── dev/
│   ├── account.hcl
│   └── ngb1/
│       ├── region.hcl
│       ├── vpc/
│       │   └── terragrunt.hcl
│       └── instance/
│           └── terragrunt.hcl
├── staging/
│   ├── account.hcl
│   └── ngb1/
│       ├── region.hcl
│       ├── vpc/
│       │   └── terragrunt.hcl
│       └── instance/
│           └── terragrunt.hcl
...
```


##### Horizontal

This is what `Atmos` "horizontal" `dev` context looks like:

```yaml
import:
  - mixins/global/providers/hetzner-cloud
  - mixins/locations/ngb1
  - orgs/dev/_defaults
  - layers/infrastructure
```

With `atmos` imports, with a single look at the file, you will know what you import and already get an idea of what it looks like.

### Conclusion

Atmos is a `YAML` "merger" system that will deploy Terraform infrastructure for you. These merged YAML files provide many interesting properties that allow smooth interactions between components (like sharing inputs/outputs, dependencies, etc.). On top of this, Atmos also allows you to create YAML file templates with Go templates to enhance your stack definition and reusability.

## Workflows \& Tools

Atmos is **not only a CLI but a framework**. It does not force you to follow a strict file tree. On the contrary, Atmos will follow what you need according to what you define in its configuration files.

In this section, I will quickly describe the configurations that can be provided to Atmos to align with your needs.

### Design Patterns \& Stack Paths

One of the key parameters inside the `atmos.yaml` file (used to configure Atmos) is that you can define where the stacks you want to deploy will be located:

```yaml
stacks:
  base_path: "stacks"
  name_pattern: "{tenant}-{environment}-{stage}"
  included_paths:
    # Tell Atmos to search for the top-level stack manifests in the `orgs` folder and its sub-folders
    - "orgs/**/*"
  excluded_paths:
    # Tell Atmos that the `defaults` folder and all sub-folders don't contain top-level stack manifests
    - "defaults/**/*"
```

This flexibility allows you to organize your repository as you want. But to enhance the adoption of their tool, Cloud Posse (the company behind Atmos) has defined some `Design Patterns` that you can use: [Atmos Design Patterns](https://atmos.tools/design-patterns/)

> When I started looking at Atmos documentation, I felt lost. Their documentation is maybe "too comprehensive". The part that disturbed me most is the `Design Patterns` section. At the beginning, I thought it was best practices to follow **but it is not**. In this section, Cloud Posse **suggests** some mono-repository architectures. It can give you **some ideas about how you would like to organize your mono-repository**.

Even though it looks complicated (there are 14 Design patterns 😅), I highly recommend taking a look as it gives you some good ideas and shows the capabilities of Atmos.
{.is-warning}

After defining what stacks to deploy with your Atmos CLI, you will be able to `import` as many stack configurations as needed to complete your infrastructure.

### Custom Workflows

Atmos allows you to create your own [workflows](https://atmos.tools/core-concepts/workflows/). A workflow is a list of commands that `atmos` will perform for you. For example:

```yaml
workflows:
  eks-up:
    description: |
      Bring up the EKS cluster.
    steps:
      - command: terraform apply vpc -auto-approve
      - command: terraform apply eks/cluster -auto-approve
      - command: terraform apply eks/alb-controller -auto-approve
```

And since everything is defined in a `YAML` file within your mono-repository, you can even add commands \& tools (through [custom commands](https://atmos.tools/core-concepts/custom-commands/)) that were not originally designed to be used by Atmos. For example, you might want to use Ansible to perform configuration:

```yaml
- name: ansible run
  description: "Runs an Ansible playbook, allowing extra arguments after --."
  arguments:
    - name: playbook
      description: "The Ansible playbook to run"
      default: site.yml
      required: true
  steps:
    - "ansible-playbook {{ .Arguments.playbook }} {{ .TrailingArgs }}"
```


### Open Policy Agent Validation

Another great feature that I was happy to find when I tested Atmos is the native integration of [`Open Policy Agent Validation`](https://atmos.tools/core-concepts/validate/opa).

Atmos has native support for the OPA decision-making engine to enforce policies across all components in stacks.

For example, I can define a simple rule that says I only allow `dev`, `staging`, or `prod` environments:

```go
package atmos
errors[message] {
  not {"prod", "staging", "dev"}[input.vars.environment]
  message := "Environment must be one of 'prod', 'staging', or 'dev'"
}
```

And validate it when I plan or just check the stack:

```bash
atmos validate component -s dev network
INFO Validated successfully component=network stack=dev
```

Having this integration will help you create policies and constantly validate them before a `terraform apply`, ensuring that you control what you want to deploy.

## Other Features

Before moving to the next section, I would like to list some interesting features I didn't test but that are definitely worth knowing:

- [Vendor Manifests](https://atmos.tools/core-concepts/vendor/vendor-manifest): Capability of downloading 3rd-party components, stacks, and other artifacts in the repository.

> I use this feature extensively in [Terraspace](https://terraspace.cloud/docs/terrafile/usage/) through `Terrafile`.

- [JSON Schema Validation](https://atmos.tools/core-concepts/validate/json-schema): Similar to OPA validation but for JSON Schema
- [Abstract Components](https://atmos.tools/design-patterns/abstract-component/): Similar to `interfaces` in traditional programming languages, it can provide another abstraction layer if you share your stacks with multiple teams.
- [Hooks](https://atmos.tools/core-concepts/stacks/hooks): Ability to perform actions at various points in the lifecycle of components


# Mono-Repository Implementation Overview

In this final section, I will present the results of my research and how I plan to use Atmos in my mono-repository.

## Objectives

In my mono-repository, I want to be able to:

- Define my components
- Create environment-agnostic stacks (that I will call `layers`) where I can define default logic between my components. I also want to define the default logic and dependencies between my components so I can focus only on context variables when I instantiate my stack
- Have a folder dedicated to context variables. By context variables, I mean any variable that I will provide to the `layers` to instantiate them. This also includes `backends`, `locations`, and `schema` verifications.
- Have a folder that lists my stack instantiations named `orgs`.
- Add OPA policies


## `Mono-Repository` Presentation

My mono-repository can be found here: [Atmos example](https://gitlab.com/tavern9121/atmos).

In this example, I have two `components` stacked with the layer `infrastructure.yml`:

- `network`: Simple network and subnet creation
- `instance`: Server created in the subnet created in the `network` component


#### Definitions {.tabset}

##### Component: Network

```hcl
# ./components/terraform/network/main.tf
resource "hcloud_network" "this" {
  name     = "network-${var.environment}"
  ip_range = var.ip_range
  labels = {
    "environment" = var.environment,
    "component"   = local.component
  }
}
resource "hcloud_network_subnet" "public_subnet" {
  type         = "cloud"
  network_id   = hcloud_network.this.id
  network_zone = var.public_subnet_location
  ip_range     = cidrsubnet(var.ip_range, 8, 1)
}
```


##### Component: Instance

```hcl
# ./components/terraform/instance/main.tf
...
resource "hcloud_server" "this" {
  name         = var.name
  image        = var.image
  server_type  = var.server_type
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.this.name]
  firewall_ids = [hcloud_firewall.this.id]
  lifecycle {
    ignore_changes = [ssh_keys]
  }
  network {
    network_id = var.network_id
    ip         = cidrhost(var.public_subnet_ip_range, 1)
  }
}
```


##### Layer: Infrastructure

```yaml
components:
  terraform:
    network:
      metadata:
        component: network
    instance:
      settings:
        depends_on:
          1:
            component: network # Dependency definition
      metadata:
        component: instance
      vars:
        # Output from network into instance inputs with mocking
        network_id: !terraform.output network "network_id // \"123\""  
        public_subnet_ip_range: !terraform.output network "public_subnet_ip_range // \"10.0.1.0/24\""
```

Then I've created a `mixins` folder. In this folder, I store any context variable values:

```yaml
# mixins file tree
├── global # Global variables that I want to pass to all my stacks
│   ├── backends # Gather all backend configurations
│   │   └── gitlab.yaml.tmpl
│   ├── providers # Credentials to connect to cloud provider
│   │   └── hetzner-cloud.yaml
│   └── schemas # Global validation rules that I want to pass to my stacks
│       └── environment.yaml
└── locations
    └── ngb1.yaml # Specific variables to the location ngb1.yaml
```

Finally, all these configurations are gathered in the folder `orgs`:

```yaml
.
├── dev
│   ├── _defaults.yaml
│   └── infrastructure.yaml
├── prod
└── staging
```

In `_defaults.yml`, I put any variable related to the `dev` environment.

In `infrastructure.yaml`, I instantiate my stack `infrastructure` defined in my `layers`:

```yaml
import: # Imports all configurations from mixins folder
  - mixins/global/backends/gitlab
  - mixins/global/providers/hetzner-cloud
  - mixins/global/schemas/environment
  - mixins/locations/ngb1
  - orgs/dev/_defaults
  - layers/infrastructure
# Add only values specific to my instantiation
components:
  terraform:
    network:
      vars:
        ip_range: 10.0.0.0/16
    instance:
      vars:
        name: "instance-{{ .vars.environment }}"
        ssh_public_key: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINkRVwkIdjqpWXHKlQ+28+rGFFrlsdWhqqmfL9U6Nb0m
```
## CLI Commands

With this `mono-repository` structure, I have a choice of commands I can launch to deploy my infrastructure:

### Deployment {.tabset}

#### Only One `Component`:

```bash
export HCLOUD_TOKEN=....
export TF_HTTP_PASSWORD=...
atmos terraform plan -s dev network
```

And it results in:

```bash
Initializing the backend...
Successfully configured the backend "http"! OpenTofu will automatically
use this backend unless the backend configuration changes.
Initializing provider plugins...
- Reusing previous version of hetznercloud/hcloud from the dependency lock file
- Using previously-installed hetznercloud/hcloud v1.52.0
OpenTofu has been successfully initialized!
Acquiring state lock. This may take a few moments...
OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create
OpenTofu will perform the following actions:
  # hcloud_network.this will be created
  + resource "hcloud_network" "this" {
      + delete_protection        = false
      + expose_routes_to_vswitch = false
      + id                       = (known after apply)
      + ip_range                 = "10.0.0.0/16"
      + labels                   = {
          + "component"   = "network"
          + "environment" = "dev"
        }
      + name                     = "network-dev"
    }
  # hcloud_network_subnet.public_subnet will be created
  + resource "hcloud_network_subnet" "public_subnet" {
      + gateway      = (known after apply)
      + id           = (known after apply)
      + ip_range     = "10.0.1.0/24"
      + network_id   = (known after apply)
      + network_zone = "eu-central"
      + type         = "cloud"
    }
Plan: 2 to add, 0 to change, 0 to destroy.
Changes to Outputs:
  + network_id             = (known after apply)
  + public_subnet_ip_range = "10.0.1.0/24"
```


#### Full `Dev` Environment:

Or alternatively, I can deploy my full `dev` environment with the command:

```bash
atmos terraform plan -s dev
```

And the result:

```bash
✓ Fetching network_id // "123" output from network in dev
Initializing the backend...
Successfully configured the backend "http"! OpenTofu will automatically
use this backend unless the backend configuration changes.
Initializing provider plugins...
- Reusing previous version of hetznercloud/hcloud from the dependency lock file
- Using previously-installed hetznercloud/hcloud v1.52.0
OpenTofu has been successfully initialized!
Acquiring state lock. This may take a few moments...
OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create
OpenTofu will perform the following actions:
  # hcloud_firewall.this will be created
  + resource "hcloud_firewall" "this" {
      + id     = (known after apply)
      + labels = (known after apply)
      + name   = "this"
      + rule {
          + destination_ips = [
              + "0.0.0.0/0",
              + "::/0",
            ]
          + direction       = "out"
          + port            = "any"
          + protocol        = "tcp"
          + source_ips      = []
        }
      + rule {
          + destination_ips = [
              + "0.0.0.0/0",
              + "::/0",
            ]
          + direction       = "out"
          + port            = "any"
          + protocol        = "udp"
          + source_ips      = []
        }
      + rule {
          + destination_ips = []
          + direction       = "in"
          + port            = "22"
          + protocol        = "tcp"
          + source_ips      = [
              + "0.0.0.0/0",
              + "::/0",
            ]
        }
      + rule {
          + destination_ips = []
          + direction       = "in"
          + port            = "443"
          + protocol        = "tcp"
          + source_ips      = [
              + "0.0.0.0/0",
              + "::/0",
            ]
        }
      + rule {
          + destination_ips = []
          + direction       = "in"
          + port            = "80"
          + protocol        = "tcp"
          + source_ips      = [
              + "0.0.0.0/0",
              + "::/0",
            ]
        }
    }
  # hcloud_server.this will be created
  + resource "hcloud_server" "this" {
      + allow_deprecated_images    = false
      + backup_window              = (known after apply)
      + backups                    = false
      + datacenter                 = (known after apply)
      + delete_protection          = false
      + firewall_ids               = (known after apply)
      + id                         = (known after apply)
      + ignore_remote_firewall_ids = false
      + image                      = "debian-12"
      + ipv4_address               = (known after apply)
      + ipv6_address               = (known after apply)
      + ipv6_network               = (known after apply)
      + keep_disk                  = false
      + location                   = "nbg1"
      + name                       = "instance-dev"
      + primary_disk_size          = (known after apply)
      + rebuild_protection         = false
      + server_type                = "cx22"
      + shutdown_before_deletion   = false
      + ssh_keys                   = [
          + "this",
        ]
      + status                     = (known after apply)
      + network {
          + alias_ips   = (known after apply)
          + ip          = "10.0.1.1"
          + mac_address = (known after apply)
          + network_id  = 123
        }
    }
  # hcloud_ssh_key.this will be created
  + resource "hcloud_ssh_key" "this" {
      + fingerprint = (known after apply)
      + id          = (known after apply)
      + labels      = {}
      + name        = "this"
      + public_key  = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINkRVwkIdjqpWXHKlQ+28+rGFFrlsdWhqqmfL9U6Nb0m"
    }
Plan: 3 to add, 0 to change, 0 to destroy.
Releasing state lock. This may take a few moments...
Initializing the backend...
Successfully configured the backend "http"! OpenTofu will automatically
use this backend unless the backend configuration changes.
Initializing provider plugins...
- Reusing previous version of hetznercloud/hcloud from the dependency lock file
- Using previously-installed hetznercloud/hcloud v1.52.0
OpenTofu has been successfully initialized!
OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create
OpenTofu will perform the following actions:
  # hcloud_network.this will be created
  + resource "hcloud_network" "this" {
      + delete_protection        = false
      + expose_routes_to_vswitch = false
      + id                       = (known after apply)
      + ip_range                 = "10.0.0.0/16"
      + labels                   = {
          + "component"   = "network"
          + "environment" = "dev"
        }
      + name                     = "network-dev"
    }
  # hcloud_network_subnet.public_subnet will be created
  + resource "hcloud_network_subnet" "public_subnet" {
      + gateway      = (known after apply)
      + id           = (known after apply)
      + ip_range     = "10.0.1.0/24"
      + network_id   = (known after apply)
      + network_zone = "eu-central"
      + type         = "cloud"
    }
Plan: 2 to add, 0 to change, 0 to destroy.
Changes to Outputs:
  + network_id             = (known after apply)
  + public_subnet_ip_range = "10.0.1.0/24"
```


## My Opinion

In this final section, I will provide my honest opinion about this tool.

### Advantages \& Disadvantages

#### Assessment {.tabset}

##### ✅ Advantages

- **Mono-repository experience**: This tool provides the complete experience of what a mono-repository tool should provide. It allows you to correctly arrange your codebase according to your needs and provides you with a single CLI command to instantiate your infrastructure
- **Flexibility**: Using this `YAML` merging system, `Atmos` allows you to do basically everything. Moreover, the Go templating system integration further enhances your possibilities to manage your infrastructure
- **Documentation**: The Atmos documentation is very comprehensive. Maybe too comprehensive, and you can spend hours reading everything that is possible to do with the tool. I still think that the `Design Patterns` section should be renamed for clarity


##### ❌ Disadvantages

- **Learning Curve**: I have extensive experience with Terraform. However, I still struggled to fully understand how Atmos works. I wouldn't recommend this tool to someone who has never worked with Terraform because the learning curve would be too steep.

### Would I recommend Atmos

I would definitely recommend Atmos to a company that is looking for a tool that need to deploy complex infrastructure in different environment. However, the company should take some time to test atmos and define what is the best workflow to fits their needs. I personally was looking for a replacement of Terraspace, and I've found it