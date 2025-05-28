# 🚀 sudo push - render clone

A deployment service similar to [render.com](https://render.com), powered by **Kubernetes** and designed for simplicity and scalability.

---

## 🧱 Project Structure

```
.
├── render-clone/    # Frontend - Built with Next.js 15
└── server/          # Backend - Express API & Kubernetes client for managing deployments
```

- The backend handles the deployment logic and interacts with Kubernetes to spin up pods for different user services.
---

## ☸️ Kubernetes Setup (Azure AKS)

Kubernetes is **only used** for deploying user services (not the main backend).

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

## 📌 Notes

- The **main backend (`server/`) is not containerized or deployed via Kubernetes** yet.
- All deployment pods (user services) are managed dynamically using Kubernetes from the backend API.

---

Feel free to ask if you'd like badges, Dockerfile notes, or deployment steps added.
