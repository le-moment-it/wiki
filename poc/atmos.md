---
title: Atmos -- A Modern Composable Framework
description: Blueprint creation for Terraform/OpenTofu infrastructure with YAML
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

However, in 2025, I have more and more doubt regarding if `Terraform` will be maintained in the long term. More and more Github `issues` requires updates that developers from `boltops` company cannot provide due to business priorities.

That's why, even if I work a lot with `Terraspace` , I need now to check which tools are available on the market to manage Terraform code efficiently. Among all solutions, I've retained the following ones :

- [Atmos](https://atmos.tools/) : A modern composable framework for tools such as Terraform, OpenTofu, Packer and Helmfile. It is the tool that I will present in this article.
- [Terramate](https://terramate.io/docs/): Another tool to deploy and manage Terraform code based
- [Terragrunt](https://terragrunt.gruntwork.io/) : The Terraform historical wrapper. Even if I already tested this solution many times, I plan to test it again because the `Gruntwork` team implemented some very interesting features explained here : [Road to Terragrunt 1.0](https://www.gruntwork.io/blog/the-road-to-terragrunt-1-0-stacks)



# Wrapper requirements
