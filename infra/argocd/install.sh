#!/usr/bin/env bash
# Installs ArgoCD into the kind cluster and points it at this repo's
# app-of-apps root Application, so every service listed in apps/ gets synced.
set -euo pipefail

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "Waiting for ArgoCD server to be ready..."
kubectl wait --namespace argocd \
  --for=condition=available deployment/argocd-server \
  --timeout=180s

kubectl apply -f "$(dirname "$0")/apps/root-app.yaml"

echo
echo "ArgoCD installed. Root Application applied — it will sync everything under infra/argocd/apps/."
echo "Get the initial admin password with:"
echo "  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
echo "Port-forward the UI with:"
echo "  kubectl -n argocd port-forward svc/argocd-server 8081:443"
echo "Then open https://localhost:8081 (user: admin)"
