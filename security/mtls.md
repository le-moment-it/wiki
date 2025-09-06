---
title: Mutual TLS
description: Mutual TLS workshop and explanation
published: true
---

# Introduction

Mutual TLS, or mTLS for short, is a method for mutual authentication. mTLS ensures that the parties at each end of a network connection are who they claim to be by verifying that they both have the correct private key. The information within their respective TLS certificates provides additional verification.

# Workshop

## Context

In this workshop, we have **client B** and **client C**. We want to connect them together using mTLS.
The objective of this workshop is to create a communication `client B -> client C` using mTLS.

These will be the following steps :

- Generate CA Root Certificate for Client C
- Generate CA Root Certificate for Client B
- Generate Intermediate CA Certificate for Client C (optional)
- Generate Intermediate CA Certificate for Client B (optional)
- Generate CSR from Client B for Client C
- Client C Signs CSR from CSR and returns the Certificate
- Create Server Certificate for Client C

## Step to step workshop

### Generate CA Root Certificate for Client C
### {.tabset}
#### Commands

First, create the directory structure and generate Client C's root CA:

```bash
# Create directory structure for Client C CA
mkdir -p client_c_ca/{certs,private,csr}
cd client_c_ca

# Generate Client C root CA private key
openssl genrsa -aes256 -out private/client_c_root_ca.key 4096

# Generate Client C root CA certificate (self-signed)
openssl req -x509 -new -nodes -key private/client_c_root_ca.key -sha256 -days 3650 \
    -out certs/client_c_root_ca.crt \
    -subj "/C=FR/ST=Iles-De-France/L=Paris/O=Client C Organization/OU=IT Department/CN=Client C Root CA"
```

Verification Command :

```bash
openssl x509 -in certs/client_c_root_ca.crt -text -noout
```

#### Result

![Step1](/assets/security/step1.jpg =100%x)

### Generate CA Root Certificate for Client B
### {.tabset}

```bash
# Create directory structure for Client B CA
mkdir -p client_b_ca/{certs,private,csr}
cd client_b_ca

# Generate Client B root CA private key
openssl genrsa -aes256 -out private/client_b_root_ca.key 4096

# Generate Client B root CA certificate (self-signed)
openssl req -x509 -new -nodes -key private/client_b_root_ca.key -sha256 -days 3650 \
    -out certs/client_b_root_ca.crt \
    -subj "/C=FR/ST=Iles-De-France/L=Paris/O=Client B Organization/OU=IT Department/CN=Client B Root CA"
```

Verification command :

```bash
# Verify the root CA certificate
openssl x509 -in certs/client_b_root_ca.crt -text -noout
```