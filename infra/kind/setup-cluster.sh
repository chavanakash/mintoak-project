#!/usr/bin/env bash
# Creates a kind cluster wired up with a local image registry and ingress-nginx.
# This is the local stand-in for "push to ECR, run an ALB Ingress" — same shape,
# no cloud provider.
set -euo pipefail

REGISTRY_NAME="kind-registry"
REGISTRY_PORT="5051"

# 1. local registry container, reused across runs if it already exists
if [ "$(docker inspect -f '{{.State.Running}}' "${REGISTRY_NAME}" 2>/dev/null || true)" != 'true' ]; then
  docker run -d --restart=always -p "127.0.0.1:${REGISTRY_PORT}:5000" \
    --network bridge --name "${REGISTRY_NAME}" registry:2
fi

# 2. cluster
kind create cluster --config "$(dirname "$0")/kind-config.yaml"

# 3. connect the registry to the kind network so nodes can pull from it by name
docker network connect kind "${REGISTRY_NAME}" 2>/dev/null || true

# 4. tell the cluster (via a ConfigMap, the documented kind convention) that
# a local registry is in use, for any tooling that wants to discover it
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${REGISTRY_PORT}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF

# 5. ingress-nginx, using the kind-specific manifest (matches the node labels above)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo "Cluster ready. Ingress is reachable at http://localhost:8080"
echo "Push images as: docker push localhost:${REGISTRY_PORT}/<service>:<tag>"
