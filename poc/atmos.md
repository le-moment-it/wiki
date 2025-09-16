---
title: Atmos
description:  A Modern Composable Framework YAML based
published: true
---

# Information
| Project | Version | Date |
|-----------|-----------|-----------|
| [atmos](https://atmos.tools/)   | 1.187.0 | 2025-08-26  |

> In this article, I will give share my opinion and experience regarding how a Terraform/OpenTofu should be maintained and why a tool is good or not. If you don't agree with my point of view, feel free to reach out so we can discuss and share our opinions and experiences about these tools we love to use ♥️
{.is-warning}

# Context
Terraform (& OpenTofu) are ,by far, became the standard to deploy infrastructure in the cloud. I personnaly use Terraform since 2019 and I accumulated a lot of experience using these tools. I quickly understood that Terraform would become easier to maintain and scale if I could wrap it with another tool to keep the infrastructure DRY (Don't Repeat Yourself).

The first most popular tool at the time was [Terragrunt](https://terragrunt.gruntwork.io/). However, after many tests, I often came to the conclusion that `Terragrunt` was very tedious to use and maintain. It requires you to create too many files in a lot of different folders without answering the main purpose of the tool : Keep the infrastructure DRY.

In 2021, I've discovered [Terraspace](https://terraspace.cloud/), and I immediately found that this tool promising. I will describe why in the next section : [Wrapper requirements](#wrapper-requirements).

However, in 2025, I have more and more doubt regarding if `Terraspace` will be maintained in the long term. More and more Github `issues` requires updates that developers from `boltops` company cannot provide due to business priorities.

That's why, even if I work a lot with `Terraspace` , I need now to check which tools are available on the market to manage Terraform code efficiently. Among all solutions, I've retained the following ones :

- [Atmos](https://atmos.tools/) : A modern composable framework for tools such as Terraform, OpenTofu, Packer and Helmfile. It is the tool that I will present in this article.
- [Terramate](https://terramate.io/docs/): Another tool to deploy and manage Terraform code based
- [Terragrunt](https://terragrunt.gruntwork.io/) : The Terraform historical wrapper. Even if I already tested this solution many times, I plan to test it again because the `Gruntwork` team implemented some very interesting features explained here : [Road to Terragrunt 1.0](https://www.gruntwork.io/blog/the-road-to-terragrunt-1-0-stacks)



# Wrapper requirements

> What makes a tool a **good wrapper** to Terraform or OpenTofu ?

**That's the eternal question**. I could (and will) write an entire article about how to manage **Infrastructure As Code** repositories. However, I will try to remain concede in this part and only focus on Terraform/OpenTofu related repositories.


## Must be `stack` focused

Compared to other programmatical languages, HCL (Terraform language) is pretty easy to learn and to read. However, when we start to create bigger infrastructure, the number of code line increases significaly and it becomes harder to maintain. That's why we created Terraform module, reusable piece of code, a simple call to a module could deploy multiple resources. But, if we take a look to one of the most popular module [AWS VPC Terraform VPC](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest), we can see that implementing this module, and adding other modules on top of it can be tedious to maintain if we need to deploy multiple environments, in multiple region for multiple teams etc ....

Even if I never read an article about it, a **need of `stack` abstraction had appeared**.

A `stack` is a group of one or multiple **`indivisible`** piece of infrastructure that attend to work together. From now on, I will call these pieces **`components`**.

For example, if I wanted to create a `stack` to deploy a new `instance`, maybe this `stack` would be a combination of the following `components` :

- [network](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/network) : Network where the instance will be deployed
- [subnet](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/network_subnet) : Definition of the `subnets` inside the `network`
- [instance](https://registry.terraform.io/modules/terraform-hetzner-modules/server/hetzner/latest) : `Instance` the actual instance

More and more , all infrastructure as code tools tends to focus be more `stack` focus. Among many examples, we can find : 👇

### Stack examples {.tabset}
#### Atmos
In `Atmos`, a `component` is named **component** or **Terraform "root" module**. It is an independent piece of terraform code where we will define what our component will deploy. An example can be :

```
resource "hcloud_network" "this" {
  name     = "network-${var.environment}"
  ip_range = var.ip_range
}
```

Then a `stack` will be a **collection** of `components` defined in a **yaml file**. In this example , two components `network` & `instance` are deployed in the stack :
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

**More details about stacks in the next parts of this documentation 🧑‍💻** 

#### Terraspace

In Terraspace, a `stack` is called a `stack`. It allows you to define a piece of Terraform code that can be deployed separately from other stacks. Moreover, you can define dependencies between stacks to deploy them in the correct order if needed. This is an example of stack definition:

```
$ terraspace new stack demo
=> Creating new stack called demo.
      create  app/stacks/demo
      create  app/stacks/demo/main.tf
      create  app/stacks/demo/outputs.tf
      create  app/stacks/demo/variables.tf
You can use `terraspace new module` to create the a starter module structure. Example:
```

#### Terramate

> I didn't have the chance yet to give `Terramate` a try.
{.is-warning}

In Terramate, a `stack` is called a `stack`. It allows you to define a piece of Terraform code that can be deployed separately from other stacks. Moreover, you can define dependencies between stacks to deploy them in the correct order if needed. This is an example of stack definition:
```
# ./stacks/vpc/stack.tm.hcl
stack {
  name        = "Main VPC"
  description = "Stack to manage the main VPC"
  id          = "3271f37c-0e08-4b59-b205-1ee61082ff26"
}
```

#### Terragrunt

> I didn't have the chance yet to test `Terragrunt` `units` & `stacks`.
{.is-warning}

In its Road to [Terragrunt 1.0](https://www.gruntwork.io/blog/the-road-to-terragrunt-1-0-stacks), [Terragrunt](https://terragrunt.gruntwork.io/) announced the two importants new features :

- `units` : Abstraction layer on a top of a module instanciation. It forces you to define inputs to the modules and extract outputs.

- `stacks`: Construct for provisioning one or more `units`. Within the same `stack` , `units` can pas data to each other and be provisioned and de-provisioned in proper order.

```
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
[Terraform](https://developer.hashicorp.com/terraform) itself introduced a stack system where you can define multiple `components` within a `stack` :

```
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

Then an instanciation of this stack is defined by a `deployment` :

```
# deployments.tfdeploy.hcl

deployment "production" {
    inputs = {
        aws_region     = "us-west-1"
        instance_count = 2
    }
}
```

### Stacks requirements

Stacks are an abstraction layer built on top of components, which themselves are often abstractions over Terraform modules.
To ensure these abstraction layers remain efficient, they need to be **environment-agnostic**. This means your stacks must be deployable regardless of the environment (`prod`, `staging`, etc.) as well as other variable values that define the deployment context (for example: region, location, size, etc.).

#### Stacks {.tabset}
##### Agnostics

This is an example of an **environment-agnosti** network :

```
resource "hcloud_network" "this" {
  name     = "network-${var.environment}"
  ip_range = var.ip_range
}
```

##### None Agnostics

This is an example of an **none environment-agnosti** network :

```
resource "hcloud_network" "this" {
  name     = "mynetwork"
  ip_range = var.ip_range
}
```

## Must be `mono-repository` capable

Another question we often see on internet is how should I organise my Terraform repositories. Should I create separate repositories per services, per department or keep everyting in the same. Obviously, there is not good answer to this question but this is my opinion on the topic.

**A single repository** (or maybe 2 according to your organisation) **per department** should be enough to manage the deployment of the infrastructure managed by this same department.
Too many repositories often leads to too many actions (and merge requests) to perform a single update. Moreover, when you use too many repositories, you might miss opportunities to centralise the management of you infrastructure. 

That's why I highly advice using `mono-repositories`. Mono-repositories brings the best of the two world between `monolith` and `micro-services` repositories (vocabulary often use for software development). With `mono-repositories`, you will be able to centralize the management of your code (more details in [Must provide a `centralised` experience](#must-provide-a-centralised-experience)) and easily tracks changes in your infrastructure.

> `Mono-repository` **does not mean** `monolith` because within the same mono-repository , you will be able to deploy multiple infrastructure that **does not depends on each other**. For example, you can use different Terraform `workspaces` or more simply different terraform state name according to your need.
{.is-success}

Within you `mono-repository`, you will be able to develop your stack, **but also the instanciation of these stacks** using context variables (environment, location etc ...). Sometimes, these context variables are called : `layers`.

Having a well though `mono-repository` structure is **crucial** and must be **highly thoughts** by your organisation before implemeting them.
Luckily, tools such as `Atmos`, `Terragrunt` and `Terraspace`  suggest you (and sometime forces you) to follow a specific `mono-repository` structure to ensure that the tool will be able to parse correctly the configurations. However, your `mono-repository` must answer **your need** and **your practices**.

## Must be `configuration as code` friendly

Like I mentionned in the [Must be `mono-repository` capable](#must-be-mono-repository-capable), having a `mono-repository` that fits your organisation needs is crucial. That's why having a tool enough "flexible" to answer all possible needs is important. To achieve this, the tool needs to be configurable **with code**. And of course, this code **must** be in the mono-repository where the tool will be launched. With a single read of the configuration files, you are able to understand how the `mono-repository` is working and you will be ready to use it.

Having a highly configurable capability make a big difference between a good tool and a great tool. Let's see some examples :

### Configurable tools {.tabset}

#### Terraspace

Terraspace `mono-repository` includes a dedicated `config` folder when you will be able to [configure various aspects](https://terraspace.cloud/docs/config/reference/) :

```perl
Terraspace.configure do |config|
  config.logger.level = :info
  config.test_framework = "rspec"
end
```

#### Atmos

The Atmos cli must have a `atmos.yaml` file to know how to interact with the [various tools and configuration it manages](https://atmos.tools/cli/configuration/#configuration-file-atmosyaml) :

```
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

## Must provide a `centralised` experience

The last but not least important for having a great wrapper is its capacity to `centralise` actions that you can perform within the repository.
Let's take some example from the development practices : 👇

### Development practices {.tabset}

#### Node.js

Node.js developers use their `package.json` to wrap long and tedious commands and easily call them with command such as :

```bash
npm run <command>
```

A `package.json` could looks like :

```json
  "scripts": {
    "test": "shell=$(basename -- $(ps -o comm= $(ps -o ppid= -p $PPID)) | sed 's/^-//'); make test-$shell",
    "markdown-link-check": "git ls-files | command grep -E '\\.md$' | xargs -n 1 markdown-link-check -p"
  },
```

#### PHP Composer

Composer developers use their `composer.json` to wrap long and tedious commands and easily call them with command such as : 

```bash
composer run-script
```

A `composer.json` could looks like :

```json
{
    "scripts": {
        "post-update-cmd": "MyVendor\\MyClass::postUpdate"
    }
}
```

###

As a DevOps , when I choose the tool that I will interact with during all my development experience, I want the exact seamless experience as the deveopers have when they develop their applications.

That's why I want to interact with a **single cli** that will automatically perform actions according to arguments I will provide to it. This single cli will bring this `centralised` experience that I am looking for.

Finally, having, this single cli interaction will slighly help to develop and debug the CI/CD that will then perform actions for you after each of your commit or merge requests merged.

# Atmos

After defined what makes a great Terraform wrapper in the previous part, let's dig into [Atmos](https://atmos.tools/).

## Stacks & Components

According to its documentation, Atmos is a "cloud architecture framework for native Terraform". It provides a simple way to build `components` and `stacks` that you can deploy to build your infrastructure :

- `components` : Also called `Terraform "root" module`, this is the "real" code that will be deployed by Terraform.
- `stacks` : **YAML** definition of `components` to deploy.

> I am not gonna lie when I will say that I wasn't sceptical when I first see YAML code to instanciate Terraform modules. But at the end of the day, using the HCL configuration language or YAML is the same :

### Example {.tabset}

#### HCL

```
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

### Components dependencies

Like I mentionned in [Must be `stack` focused](#must-be-stack-focused), `components` has dependencies, and Atmos allows you to easily define them within your stack definition.

For example, if you want your component `instance` to depends on `network` :

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

Moreover, if you need an output value from the `network` component as an input of the `instance` component :

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
        network_id: !terraform.output network "network_id // ""123"""
        public_subnet_ip_range: !terraform.output network "public_subnet_ip_range // ""10.0.1.0/24"""

```
### Atmos CLI

One of the most powerful aspect of `atmos` is its CLI. The `atmos` cli provides every information that helps us to debug configuration of our `components` and `stack`. By a single `atmos describe component <component>` , you will see the full YAML configuration ([ref](https://atmos.tools/core-concepts/describe/component)):

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

All these values, are all information you will need to understand what is under the hood of the atmos component. They also are a great source of information for variables to use when you will create templates.

### Templates

Your atmos `mono-repository` will contain different contexts :

- `environment` : You can have multiple environment such as `prod`, `stage` or `dev`
- `location` : You may need to deploy in multiple regions available with your cloud providers
- ...

Since you want to deploy stacks, you may want to use these context values as inputs for your stacks. Atmos allows you to **template** your yaml files using [Go Templates](https://pkg.go.dev/text/template). This is incredible powerful because it allows you to have a full control of your `stack` definition according to context values.

A very simple implementation of this :

```yaml
terraform:
  backend_type: http
  backend:
    http:
      # The terraform state backend name file is dynamically built using the name of the stack, the location, and the name of the component
      # By using this system, we can ensure that no backend name conflicts can happen. Moreover, it is to find the backend needed if we
      # are looking for it.
      address: "https://gitlab.com/api/v4/projects/XXXXXXX/terraform/state/{{ .atmos_stack }}-{{ .env.LOCATION }}-{{ .atmos_component }}"
      lock_address: "https://gitlab.com/api/v4/projects/XXXXXXX/terraform/state/{{ .atmos_stack }}-{{ .env.LOCATION }}-{{ .atmos_component }}/lock"
      unlock_address: "https://gitlab.com/api/v4/projects/XXXXXXX/terraform/state/{{ .atmos_stack }}-{{ .env.LOCATION }}-{{ .atmos_component }}/lock"
      lock_method: "POST"
      unlock_method: "DELETE"
      retry_wait_min: 5
```

Having a templating system integrated within your `mono-repository` will slighly leverage your configuration management. Moreover, since in atmos, **everything** is a yaml configuration, this templating system will also leverage your workflows possibilities.

### Imports

The final , and most important feature of `atmos` : `imports`.

The [`imports`](https://atmos.tools/core-concepts/stacks/imports/) is simply the merge of two or more yaml files. To import any stack configuration from your mono-repository you can use the keyworkd `import` :

```yaml
import:
  - layers/infrastructure
```
If you import a stack configuration which is also a template, the value **will be changed accordingly to your context**.

> Why `imports` are so powerful ?

It is hard to explain how this `import` mechanism slighly improves the configuration management, but I will give it a try. **Please consider that this is my own opinion**.

Some tool such as `Terragrunt` forces you to use a "vertical" context variable definition, it means that at any folder in your file tree, you will need a `<file>.hcl` where you will define your context variable. At the opposite, atmos has more an "horizontal" approach where you just define what you want to import using the simple keyword `import` :

#### Imports {.tabset}

##### Vertical

This is what `Terragrunt` "vertical" context looks like :

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

This is what `Atmos` "horizontal" `dev` context looks like :

```yaml
import:
  - mixins/global/providers/hetzner-cloud
  - mixins/locations/ngb1
  - orgs/dev/_defaults
  - layers/infrastructure
```

####

With `atmos` imports, with a single look to the file, you will know what you import and already get an idea of what it looks like.


### Conclusion

Atmos is a `yaml` "merger" system that will deploy Terraform infrastructure for you. These yaml merged provides many interesting properties that allow smooth interactions between components (like sharing inputs/outputs, dependencies etc ..). On top of this, atmos also allows you to create yaml file template with Go templates to leverage your stack definition and reusability.

## Worklows & Tools

Atmos is **not only a CLI but a framework**. It does not forces you to follow a strict file tree. On the opposite, atmos will follow what you need according to what you will define in its configuration files.

In this part, I will quickly describe the configurations that can be provided to atmos to align your needs.

### Design pattern & Stack paths

One of the key parameter inside the file `atmos.yaml` (file use to configure atmos), is that you can define where will be the stacks that you want to deploy :

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

This flexibility allows you to organize your repository as you want. But, to enhance the adoption of their tool, Cloud Posse (the company behind atmos) defined some `Design Patterns` that you can use : [Atmos Design Patterns](https://atmos.tools/design-patterns/)

> When I starting to take a look to Atmos documentation, I felt lost. Their documentation is maybe "too much". The part that disturbed me the most is the part `Design Patterns`. At the beginning, I though it was good practices to follow **but it is not**. In this part , Cloud Posse **suggests you** some mono-repository architecture. It can give you just **some ideas of how you would like to organize your mono-repository**.
Even if it looks complicated (there are 14 Design patters 😅), I highly recommend you to take a look so it gives you some good ideas and it shows the capability of atmos.
{.is-warning}

After defining what would be the stack to deploy with your atmos cli, you will be able to `imports` as much stack configuration as needed to complete your infrastructure.

### Custom workflows

Atmos allows you to create your own [workflows](https://atmos.tools/core-concepts/workflows/). A workflow is the list of command that `atmos` will perform for you. For example :

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

And since everything is defined in a `yaml` file within your mono-repository, you can even add commands & tools (through [custom commands](https://atmos.tools/core-concepts/custom-commands/)) that were not designed to be used by atmos at first. For example, you might want to use ansible to perform configuration :

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

Another great feature that I was happy to find when I tested atmos is the native integration of [`Open Policy Agent Validation`](https://atmos.tools/core-concepts/validate/opa).
Atmos has native support for the OPA decision-making engine to enforce policies across all the components in stacks.

For example, I can define a simple rule that says that I allow only `dev` , `staging` or `prod` environment :

```go
package atmos

errors[message] {
  not {"prod", "staging", "dev"}[input.vars.environment]
  message := "Environment must be one of 'prod', 'staging', or 'dev'"
}

```

And validate it when I plan or just check the stack :

```
atmos validate component -s dev network
INFO Validated successfully component=network stack=dev
```

Having this integration will help you to create policy and constantly validate them before a `terraform apply` and ensure that you control what you want to deploy.

## Other features

Before moving to the next part, I would like to list some interesting features I didn't test but that is definitely worth to know :

- [Vendor Manifests](https://atmos.tools/core-concepts/vendor/vendor-manifest) : Capability of downloading 3rd-party components, stacks and other artifacts in the repository.

> I use a lot this feature on [Terraspace](https://terraspace.cloud/docs/terrafile/usage/) through `Terrafile`.

- [JSON Schema Validation](https://atmos.tools/core-concepts/validate/json-schema) : Similar to OPA validation but for JSON Schema

- [Abstract Components](https://atmos.tools/design-patterns/abstract-component/) : Similar to `interfaces` in traditional programmable languages, it can provides you another abstraction layers if you share your stacks to multiple teams.

- [Hooks](https://atmos.tools/core-concepts/stacks/hooks) : Ability to perform actions at various points in the lifecycle of the components

# Monorepo Implementation Overview

In this last section, I will present you the result of my researches and how I want to use atmos in my mono-repository.

## Objectives

In my mono-repository, I want to be able to :

- Define my components
- Create agnosticks stacks (that I will call `layers`) where I can define default logic between my components. I also want to define the default logic and dependencies between my components so I can only focus on context variable when I instanciate my stack
- Have a folder dedicated to context variables. By context variables, I mean, any variable that I will provide to the `layers` to instanciate them. It also gathers, `backends`, `locations` and `schemas` verifications.
- Have a folder that list my stack instanciation named `orgs`.
- Add OPA policies

## `mono-repository` presentation

My mono-repository can be found here [Atmos example](https://gitlab.com/tavern9121/atmos).

In this example, I have two `components` stacked with the layer `infrastructure.yml :

- `network` : Simple network and subnet created
- `instance` : Server created in the subnet create in the component `network`

#### Definition {.tabset}

##### Component : Network

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

##### Component : Instance

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


##### Layer : infrastructure

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
        network_id: !terraform.output network "network_id // ""123"""  
        public_subnet_ip_range: !terraform.output network "public_subnet_ip_range // ""10.0.1.0/24"""

```

####

Then I've created a `mixins` folder. In this folder, I store any context variable values :

```yaml
# mixins file tree
├── global # Global variables that I want to parse to all my stacks
│   ├── backends # Gather all backends configurations
│   │   └── gitlab.yaml.tmpl
│   ├── providers # Credentials to connect to cloud provider
│   │   └── hetzner-cloud.yaml
│   └── schemas # Global validation rules that I want to pass to my stacks
│       └── environment.yaml
└── locations
    └── ngb1.yaml # Specific variables to the location ngb1.yaml
```

Finally, all these configuration are gathered in the folder `orgs` :

```yaml
.
├── dev
│   ├── _defaults.yaml
│   └── infrastructure.yaml
├── prod
└── staging
```

In `_defaults.yml`, I put any variable related to the fact that it is the `default` environment. 

In `insfrastructure.yaml`, I instanciate my stack `infrastructure` defined in my `layers` :

```yaml
import: # Imports all configurations from mixins folder
  - mixins/global/backends/gitlab
  - mixins/global/providers/hetzner-cloud
  - mixins/global/schemas/environment
  - mixins/locations/ngb1
  - orgs/dev/_defaults
  - layers/infrastructure

# Add only values specific to my instanciation
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

## `CLI` launches

With this `mono-repository` structure, I have choices of commands I can launch to deploy my infrasctructure :

### Deployment {.tabset}

#### Only one `component` :


```bash

export HCLOUD_TOKEN=....
export TF_HTTP_PASSWORD=...

atmos terraform plan -s dev network
```

And it results in :

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

#### Full `dev` environment :
Or in the contrary, I can deploy my full `dev` environment with the command :

```bash
atmos terraform plan -s dev
```

And the result :

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