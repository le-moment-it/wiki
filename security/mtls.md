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

### STEP 1: Generate CA Root Certificate for Client C

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


### STEP 2: Generate CA Root Certificate for Client B

### {.tabset}

#### Commands

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

#### Result

![Step2](/assets/security/step2.png =100%x)

### STEP 3: Generate Intermediate CA Certificate for Client C (optional)

### {.tabset}

#### Commands

Create an intermediate CA for Client C :

```bash
cd client_c_ca

# Generate intermediate CA private key
openssl genrsa -aes256 -out private/client_c_intermediate_ca.key 4096

# Create intermediate CA certificate signing request
openssl req -new -key private/client_c_intermediate_ca.key \
    -out csr/client_c_intermediate_ca.csr \
    -subj "/C=FR/ST=Iles-De-France/L=Paris/O=Client C Organization/OU=Certificate Authority/CN=Client C Intermediate CA"

# Sign the intermediate CSR with the root CA
openssl x509 -req -in csr/client_c_intermediate_ca.csr \
    -CA certs/client_c_root_ca.crt \
    -CAkey private/client_c_root_ca.key \
    -CAcreateserial \
    -out certs/client_c_intermediate_ca.crt \
    -days 1825 -sha256 \
    -extensions v3_intermediate_ca \
    -extfile <(echo -e "[v3_intermediate_ca]\nsubjectKeyIdentifier = hash\nauthorityKeyIdentifier = keyid:always,issuer\nbasicConstraints = critical, CA:true, pathlen:0\nkeyUsage = critical, digitalSignature, cRLSign, keyCertSign")

```

Verification commands :

```bash
# Verify the intermediate certificate against root CA
openssl verify -CAfile certs/client_c_root_ca.crt certs/client_c_intermediate_ca.crt

# Check certificate chain
openssl x509 -in certs/client_c_intermediate_ca.crt -text -noout | grep -A2 "Issuer\|Subject"

```

#### Results

![Step3](/assets/security/step3.png =100%x)


### STEP 4: Generate Intermediate CA Certificate for Client B (optional)

### {.tabset}

#### Commands

Create an intermediate CA for Client B :

```bash
cd client_b_ca

# Generate intermediate CA private key
openssl genrsa -aes256 -out private/client_b_intermediate_ca.key 4096

# Create intermediate CA certificate signing request
openssl req -new -key private/client_b_intermediate_ca.key \
    -out csr/client_b_intermediate_ca.csr \
    -subj "/C=FR/ST=Iles-De-France/L=Paris/O=Client B Organization/OU=Certificate Authority/CN=Client B Intermediate CA"

# Sign the intermediate CSR with the root CA
openssl x509 -req -in csr/client_b_intermediate_ca.csr \
    -CA certs/client_b_root_ca.crt \
    -CAkey private/client_b_root_ca.key \
    -CAcreateserial \
    -out certs/client_b_intermediate_ca.crt \
    -days 1825 -sha256 \
    -extensions v3_intermediate_ca \
    -extfile <(echo -e "[v3_intermediate_ca]\nsubjectKeyIdentifier = hash\nauthorityKeyIdentifier = keyid:always,issuer\nbasicConstraints = critical, CA:true, pathlen:0\nkeyUsage = critical, digitalSignature, cRLSign, keyCertSign")

```

Verification Commands :

```bash
# Verify the intermediate certificate against root CA
openssl verify -CAfile certs/client_b_root_ca.crt certs/client_b_intermediate_ca.crt

# Check certificate details
openssl x509 -in certs/client_b_intermediate_ca.crt -text -noout | grep -A2 "Issuer\|Subject"

```


#### Results

![Step4](/assets/security/step4.png =100%x)


### STEP 5: Generate CSR from Client B to Client C

### {.tabset}

#### Commands

Client B creates a certificate signing request to be signed by Client C :

```bash
# Create directory for client certificates
mkdir -p client_b_cert

# Generate Client B's private key for the client certificate
openssl genrsa -out client_b_cert/client_b.key 2048

# Generate CSR from Client B for Client C to sign
openssl req -new -key client_b_cert/client_b.key \
    -out client_b_cert/client_b_to_client_c.csr \
    -subj "/C=FR/ST=Iles-De-France/L=Paris/O=Client B Organization/OU=Client Services/CN=client-b.local"

# Transfer the CSR to Client C (simulate file transfer)
cp client_b_cert/client_b_to_client_c.csr ../client_c_ca/csr/

```

Verification commands :

```bash
# Verify CSR content
openssl req -in client_b_cert/client_b_to_client_c.csr -text -noout

# Verify CSR signature
openssl req -in client_b_cert/client_b_to_client_c.csr -verify -noout

```

#### Results

![Step5](/assets/security/step5.png =100%x)


### STEP 6: Client C Signs the CSR and Returns the Certificate

### {.tabset}

#### Commands

Client C uses its intermediate certificate to sign Client B's CSR:

```bash
cd client_c_ca

# Create client certificate signed by Client C's intermediate CA
openssl x509 -req -in csr/client_b_to_client_c.csr \
    -CA certs/client_c_intermediate_ca.crt \
    -CAkey private/client_c_intermediate_ca.key \
    -CAcreateserial \
    -out certs/client_b_signed_by_client_c.crt \
    -days 365 -sha256 \
    -extensions v3_client \
    -extfile <(echo -e "[v3_client]\nsubjectKeyIdentifier = hash\nauthorityKeyIdentifier = keyid,issuer\nbasicConstraints = CA:FALSE\nkeyUsage = critical, nonRepudiation, digitalSignature, keyEncipherment\nextendedKeyUsage = clientAuth")

# Transfer the signed certificate back to Client B (simulate file transfer)
cp certs/client_b_signed_by_client_c.crt ../client_b_cert/

# Create certificate chain file for Client B
cat certs/client_c_intermediate_ca.crt certs/client_c_root_ca.crt > certs/client_c_ca_chain.crt
cp certs/client_c_ca_chain.crt ../client_b_cert/

```

Verification commands :

```
# Verify the signed certificate
openssl x509 -in certs/client_b_signed_by_client_c.crt -text -noout

# Verify certificate chain
openssl verify -CAfile certs/client_c_root_ca.crt -untrusted certs/client_c_intermediate_ca.crt certs/client_b_signed_by_client_c.crt

```

#### Results

![Step6](/assets/security/step6.png =100%x)