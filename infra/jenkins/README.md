# Jenkins (CI, deliberately outside the cluster)

Jenkins runs as its own `docker-compose` stack, **not** inside the kind
cluster. This is a real architectural choice, not a shortcut:

- CI needs to build Docker images — that's much simpler with direct access
  to a Docker daemon (mounted socket here) than running Docker-in-Docker or
  Kaniko inside Kubernetes.
- It enforces the GitOps boundary: Jenkins produces artifacts (images) and
  proposes desired state (a git commit). It has **no kubeconfig and no
  cluster access at all.** Only ArgoCD, running in-cluster, is allowed to
  mutate the cluster. If you were asked in an interview "how do you stop CI
  from being a backdoor into prod," this is the answer.

## Run it
```
docker compose -f docker-compose.jenkins.yml up -d
```
UI at http://localhost:8090 — first run will print an initial admin
password in the container logs (`docker compose logs jenkins`).

## Wire up each service's pipeline
For each of `merchant-service`, `transaction-service`, `notification-service`,
`frontend`: create a Jenkins **Pipeline** job (or one **Multibranch
Pipeline** pointed at the repo, filtered to trigger only when its own
service directory changes) using the `Jenkinsfile` already committed in that
service's directory. Each Jenkinsfile:
1. installs deps / lints
2. builds the Docker image
3. pushes it to the local registry at `localhost:5051`
4. bumps the image tag in `infra/k8s/base/<service>/deployment.yaml` and
   pushes that commit back to `main`

You'll need to give the Jenkins container git push credentials (a
deploy key or PAT) via Jenkins' credentials store, since the last step
pushes to your git remote.

ArgoCD (running in the kind cluster, polling the same repo) picks up that
commit and reconciles the cluster — see `infra/argocd/README.md`.
