# sudo deploy - render clone

A deployment service similar to [render.com](https://render.com), powered by **Kubernetes** and designed for simplicity and scalability.

---
- The backend handles the deployment logic and interacts with Kubernetes to spin up pods for different user services.
---

![image](https://github.com/user-attachments/assets/de2aa9fd-eede-471a-96ae-99b4b3679ba0)

## Kubernetes Setup (Azure AKS)

- Network Configuration: Azure CNI Node Subnet
- Virtual Network integration in AKS

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

## TLS - Self Signed
```sh
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout wildcard.key \
  -out wildcard.crt \
  -subj "/CN=*.tarundev.com/O=tarundev" \
  -addext "subjectAltName = DNS:*.tarundev.com"
kubectl create secret tls wildcard-tls \
  --cert=wildcard.crt \
  --key=wildcard.key
```
Update Ingress
```yaml
spec:
  tls:
    - hosts:
        - "*.tarundev.com"
      secretName: wildcard-tls
```
