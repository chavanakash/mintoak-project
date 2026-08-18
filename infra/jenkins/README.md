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

Everything about Jenkins itself is configured as code via
[JCasC](casc/jenkins.yaml) — security realm, credentials, and all 4 pipeline
jobs are defined declaratively and created automatically on first boot.
Nothing here requires clicking through the setup wizard.

## Trigger model: SCM polling, not a webhook

Each job polls the repo every ~2 minutes (`H/2 * * * *` in
`casc/jenkins.yaml`) and builds if `main` changed. A real webhook needs
GitHub to reach Jenkins over the public internet, which `localhost` isn't —
polling is the standard local-dev substitute. In a real deployment this
would be a GitHub webhook hitting Jenkins' `/github-webhook/` endpoint for
near-instant triggers instead.

## Run it

1. Make sure the kind cluster already exists (`infra/kind/setup-cluster.sh`)
   — Jenkins joins the same `kind` docker network to reach the local
   registry, so the network must exist first.
2. Copy the env template and fill in real values:
   ```
   cp .env.example .env
   ```
   - `GITHUB_TOKEN`: a GitHub PAT (fine-grained, `contents:write` scoped to
     this repo, or classic `repo` scope) — Jenkins uses this only to push the
     image-tag-bump commits it makes.
   - `JENKINS_ADMIN_PASSWORD`: whatever you want the UI admin password to be.
3. Build and start:
   ```
   docker compose -f docker-compose.jenkins.yml up -d --build
   ```
4. UI at http://localhost:8090 — log in as `admin` with the password you set.
   All 4 jobs (`merchant-service`, `transaction-service`,
   `notification-service`, `frontend`) already exist; no manual job creation
   needed.

## What each Jenkinsfile does

1. installs deps / lints (skipped for `frontend`, which builds via a
   multi-stage Dockerfile that runs its own `npm install`)
2. builds the Docker image, tagged for `kind-registry:5000` (Jenkins reaches
   the registry container directly over the shared `kind` network)
3. pushes it there
4. bumps the image tag in `infra/k8s/base/<service>/deployment.yaml` to
   `localhost:5051/<service>:<tag>` — the hostname the *cluster* resolves
   (kind's containerd mirrors `localhost:5051` to the same registry, see
   `infra/kind/kind-config.yaml`) — and pushes that commit to `main` using
   the `github-pat` credential

ArgoCD (running in the kind cluster, polling the same repo) picks up that
commit and reconciles the cluster — see `infra/argocd/README.md`.

## Manually trigger a build (without waiting for the poll)

```
curl -u admin:<password> -X POST http://localhost:8090/job/merchant-service/build
```
