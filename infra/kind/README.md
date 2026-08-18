# kind cluster

`./setup-cluster.sh` does four things, mirroring what you'd get from a cloud
provider but entirely local:

| Cloud equivalent | What we use instead |
|---|---|
| ECR / container registry | `registry:2` container on `localhost:5051`, wired into the kind Docker network |
| ALB / cloud load balancer + Ingress | `ingress-nginx`, deployed with kind's own provider manifest |
| Multi-AZ managed control plane | single-node kind cluster (fine for local learning) |
| VPC networking | kind's own Docker network (`kind`) |

Run it once:
```
./setup-cluster.sh
```

Tear down:
```
kind delete cluster --name mintoak
docker rm -f kind-registry
```

Build & push an image manually (Jenkins does this automatically per service):
```
docker build -t localhost:5051/merchant-service:dev backend/merchant-service
docker push localhost:5051/merchant-service:dev
```
