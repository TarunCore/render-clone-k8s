# sudo deploy - render clone

A deployment service similar to [render.com](https://render.com), powered by **Kubernetes** and designed for simplicity and scalability.

---
- The backend handles the deployment logic and interacts with Kubernetes to spin up pods for different user services.
---

![image](https://github.com/user-attachments/assets/f6acb6f0-b29d-4ab8-8b8c-ed6ea50baff5)

## Kubernetes Setup (Azure AKS)

Kubernetes is **only used** for deploying user services (not the main backend).
- Use `Azure CNI Node Subnet` as Network Configuration
- After cluster is created:
  - Settings -> Networking -> Virutal Network Integration -> Enable Ingress controller 

### 1. Ingress Setup

Set up NGINX Ingress Controller using Helm:

```sh
# Add the ingress-nginx Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install the ingress controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --set controller.service.externalTrafficPolicy=Local
```

### 2. Apply Initial Ingress Configuration

An empty ingress resource is applied initially. New subdomain mappings will be added dynamically for each deployed service.

```sh
cd server/k8s/
kubectl apply -f ingress.yml 
```

---

## Notes

- The **main backend (`server/`) is not containerized or deployed via Kubernetes** yet.
- All deployment pods (user services) are managed dynamically using Kubernetes from the backend API.

---

## Architecture
![image](https://github.com/user-attachments/assets/6076b23e-4ce6-4946-94aa-d397cc866890)



## Local k8s Setup with *Kind*
*Note: ingress doesn't work*
```sh
kind create cluster --config clusters.yml --name local
```
```sh
kind delete cluster --name local
```

## TLS
```sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=*.ffcscombogen.in/O=ffcscombogen.in" \
  -addext "subjectAltName=DNS:*.ffcscombogen.in"

```

```sh
kubectl create secret tls wildcard-ffcscombogen-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n default
```
Use this ingress file for HTTPS `server/k8s/own-tls.ingress.yml`
