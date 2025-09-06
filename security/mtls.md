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

<br>

### STEP 1: Generate CA Root Certificate for Client C

<br>

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

![Step1](/assets/security/step1.png =100%x)

<br>

### STEP 2: Generate CA Root Certificate for Client B

<br>

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

<br>

### STEP 3: Generate Intermediate CA Certificate for Client C (optional)

<br>

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

<br>

### STEP 4: Generate Intermediate CA Certificate for Client B (optional)

<br>

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

<br>

### STEP 5: Generate CSR from Client B to Client C

<br>

### {.tabset}

#### Commands

Client B creates a certificate signing request to be signed by Client C :

```bash
# Create directory for client certificates
mkdir -p client_b_cert

# Generate Client B's private key for the client certificate
openssl genrsa -aes256 -out client_b_cert/client_b.key 2048

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

<br>

### STEP 6: Client C Signs the CSR and Returns the Certificate

<br>

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

<br>

### STEP 7: Create Server Certificate for Client C

<br>

### {.tabset}

#### Commands

Client C needs its own server certificate for the mTLS connection :

```bash
cd client_c_ca

# Generate server private key for Client C
openssl genrsa -aes256 -out private/client_c_server.key 2048

# Create server CSR for Client C
openssl req -new -key private/client_c_server.key \
    -out csr/client_c_server.csr \
    -subj "/C=FR/ST=Iles-De-France/L=Paris/O=Client C Organization/OU=Server Services/CN=client-c.local"

# Self-sign the server certificate using Client C's intermediate CA
openssl x509 -req -in csr/client_c_server.csr \
    -CA certs/client_c_intermediate_ca.crt \
    -CAkey private/client_c_intermediate_ca.key \
    -CAcreateserial \
    -out certs/client_c_server.crt \
    -days 365 -sha256 \
    -extensions v3_server \
    -extfile <(echo -e "[v3_server]\nsubjectKeyIdentifier = hash\nauthorityKeyIdentifier = keyid,issuer\nbasicConstraints = CA:FALSE\nkeyUsage = critical, digitalSignature, keyEncipherment\nextendedKeyUsage = serverAuth\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = client-c.local\nDNS.2 = localhost\nIP.1 = 127.0.0.1")

```

#### Result

![Step7](/assets/security/step7.png =100%x)

<br>

### STEP 8: Connections tests

<br>

### {.tabset}

#### Commands

Start Client C as mTLS Server:

```bash
cd client_c_ca

# Start OpenSSL s_server with mutual TLS verification
openssl s_server -accept 8443 \
    -cert certs/client_c_server.crt \
    -key private/client_c_server.key \
    -CAfile certs/client_c_ca_chain.crt \
    -Verify 2 \
    -state

```

Test from Client B:

```bash
cd client_b_cert

# Test connection from Client B to Client C using mTLS
openssl s_client -connect localhost:8443 \
    -cert client_b_signed_by_client_c.crt \
    -key client_b.key \
    -CAfile client_c_ca_chain.crt \
    -Verify 2 \
    -state

```

#### Schema

![Step8](/assets/security/step8.png =100%x)

## Verifications commands

Certificate and Key Matching Verification :

```bash
# Verify private key matches certificate (should show same hash)
openssl rsa -noout -modulus -in client_b_cert/client_b.key | openssl sha256
openssl x509 -noout -modulus -in client_b_cert/client_b_signed_by_client_c.crt | openssl sha256

# Verify CSR matches private key
openssl req -noout -modulus -in client_b_cert/client_b_to_client_c.csr | openssl sha256

```

Certificate Chain Verification:

```bash
# Verify complete certificate chain
openssl verify -show_chain -CAfile client_c_ca/certs/client_c_root_ca.crt \
    -untrusted client_c_ca/certs/client_c_intermediate_ca.crt \
    client_b_cert/client_b_signed_by_client_c.crt

# Check certificate validity periods
openssl x509 -in client_b_cert/client_b_signed_by_client_c.crt -noout -dates

```

Connection Testing Commands:

```bash
# Test TLS connection without client certificate (should fail with mTLS server)
openssl s_client -connect localhost:8443 -CAfile client_b_cert/client_c_ca_chain.crt

# Test with wrong client certificate (should fail)
openssl s_client -connect localhost:8443 \
    -cert client_b_ca/certs/client_b_root_ca.crt \
    -key client_b_ca/private/client_b_root_ca.key \
    -CAfile client_b_cert/client_c_ca_chain.crt

```

## mTLS Handshake Process

```mermaid
sequenceDiagram
    participant Client_B as Client B
    participant Client_C as Client C

    Note over Client_B,Client_C: mTLS Handshake Process with Certificates and Keys

    Client_B->>Client_C: Client Hello (supported cipher suites, TLS version)
    Client_C->>Client_B: Server Hello (chosen cipher suite)
    Client_C->>Client_B: Send Server Certificate
    Note over Client_C,Client_B: Certificate : client_c_server.crt + Chain

    Client_C->>Client_B: Request Client Certificate
    Client_B->>Client_C: Send Client Certificate
    Note over Client_B,Client_C: Certificate: client_b_signed_by_client_c.crt + Chain

    Client_B->>Client_C: Client Key Exchange
    Note over Client_B,Client_C: Proves possession of private key (client_b.key)

    Client_B->>Client_C: Certificate Verify
    Note over Client_C: Validate client cert signed by Client C's CA

    Client_C->>Client_B: Server Finished
    Client_B->>Client_C: Client Finished

    Note over Client_B,Client_C: Secure encrypted channel established after verification

```

## Concept
Client B and Client C trust each other in a mutual TLS (mTLS) connection because both parties authenticate each other using digital certificates issued by trusted Certificate Authorities (CAs). Here's why and how this trust is established:

  1. Certificate Exchange and Verification
    During the mTLS handshake, Client C (the server) presents its server certificate to Client B (the client). Client B verifies this certificate against a list of trusted CAs it has. This confirms that Client C is who it claims to be and that its certificate is valid and trusted.

  2. Client Certificate and Proof of Possession
    Similarly, Client B presents its client certificate to Client C. Client C verifies this certificate against its trusted CA list to confirm Client B’s identity. Client B also proves possession of the private key corresponding to the certificate, ensuring the certificate is not being impersonated.

  3. Trusted Certificate Authorities (CAs)
    Both Client B and Client C **trust the same or cross-recognized Certificate Authorities that issue the certificates**. Because the certificates are signed by these trusted CAs, each party can rely on the authenticity of the other's certificate.

  4. Mutual Authentication Process
    The mutual certificate verification combined with proof of private key possession creates a strong trust relationship—each party has cryptographic proof of the other's identity before secure communication happens.

  5. Secure Encrypted Channel Established
    Once both sides verify certificates successfully, an encrypted and authenticated TLS connection is established, ensuring confidentiality, integrity, and authenticity of the communication.