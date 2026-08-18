# Architecture

A merchant-commerce SaaS platform (inspired by Mintoak's bank-to-merchant
payment-enablement model), built to practice a realistic DevOps stack end to
end: containerized microservices, Kubernetes, GitOps with ArgoCD, and CI with
Jenkins. No cloud provider — everything runs locally on `kind`.

## Why this shape

Rather than one monolith, the backend is split into three services because
that's where the actual DevOps problems live: independent deploys,
service-to-service networking, per-service scaling, async events.

| Service | Responsibility | Talks to |
|---|---|---|
| `merchant-service` | Merchant onboarding & profile CRUD | PostgreSQL |
| `transaction-service` | Records payment transactions, emits events | PostgreSQL, Kafka (producer) |
| `notification-service` | Consumes transaction events, updates the analytics feed + cache | Kafka (consumer), MongoDB, Redis |
| `frontend` | Merchant dashboard (React) | merchant-service, transaction-service, via Ingress |

**Why four datastores, not one:** each is doing the job it's actually suited
for, not "because we can."
- **PostgreSQL** — transactional data that needs integrity: merchants, transactions.
- **Redis** — hot-path cache (e.g. per-merchant transaction count/total, updated by the consumer, cheap to read on the dashboard).
- **Kafka** — decouples "a transaction happened" from "who cares and what they do about it." transaction-service doesn't know or care that notification-service exists.
- **MongoDB** — semi-structured analytics event documents fed by the Kafka consumer, shaped differently from the relational transaction record.

## Request flow: creating a transaction

```
Browser
  |  POST /api/transactions
  v
Ingress (nginx)  --- path-based routing, strips /api prefix ---
  v
transaction-service (Deployment, 2+ replicas, HPA to 8)
  |  1. writes the transaction row to Postgres
  |  2. publishes a "transaction.created" event to Kafka
  v
Kafka (single-node, KRaft mode)
  v
notification-service (Deployment, Kafka consumer group)
  |  1. inserts the raw event into MongoDB (transaction_events collection)
  |  2. increments merchant:<id>:txn_count / txn_total in Redis
```

Nothing here pushes work directly — every hop is either a synchronous HTTP
call through the Ingress or an async event through Kafka. transaction-service
never calls notification-service directly; it has no idea what (if anything)
is downstream.

## Kubernetes layout

Everything lives in a single `mintoak` namespace inside a local `kind`
cluster. Manifests are organized as one **kustomize directory per
deployable unit**, not one flat pile — this is what lets ArgoCD manage each
service as an independent sync unit instead of one big blob:

```
infra/k8s/base/
├── databases/            Namespace, Secret, Postgres (StatefulSet+PVC),
│                         Redis (Deployment), Mongo (StatefulSet+PVC),
│                         Kafka (StatefulSet+PVC, KRaft mode)
├── merchant-service/     Deployment (2 replicas) + Service + HPA (2-6, cpu 70%)
├── transaction-service/  Deployment (2 replicas) + Service + HPA (2-8, cpu 70%)
├── notification-service/ Deployment (1 replica -- single Kafka consumer group member)
├── frontend/             Deployment (2 replicas) + Service
└── ingress/              Ingress: path-routes /api/merchants, /api/transactions, /
```

**Local stand-ins for cloud infrastructure**, since this intentionally runs
without AWS:

| What a cloud setup would use | What this uses instead |
|---|---|
| ECR / container registry | `registry:2` container (`kind-registry`) on the `kind` docker network, port 5051 on the host |
| ALB + Ingress controller | `ingress-nginx`, kind's own provider manifest, mapped to `localhost:8080` |
| CloudWatch Container Insights (HPA metrics) | `metrics-server`, patched with `--kubelet-insecure-tls` (kind's kubelet certs aren't signed for the default verification path — fine locally, never do this against a real cluster) |
| Multi-AZ managed control plane | single-node kind cluster |
| VPC networking | kind's own Docker bridge network (`kind`) |

## GitOps: ArgoCD (app-of-apps)

One root `Application` (`mintoak-root`) watches `infra/argocd/apps/` in this
repo. Each file there is itself an `Application` pointing at one of the
kustomize directories above — adding a new service means adding one more
Application file, not touching the root.

Sync waves keep dependency order sane: `mintoak-databases` (wave 0) syncs
before the services (wave 1), which sync before `mintoak-ingress` (wave 2),
so the Ingress isn't routing to Services that don't exist yet.

**The core idea worth being able to explain out loud:** ArgoCD continuously
reconciles the live cluster to match whatever's in git. Nobody runs
`kubectl apply` by hand, and CI never touches the cluster directly (see
below) — git is the single source of truth, and every change is a commit,
which means every change is auditable and revertible with `git revert`.

## CI: Jenkins (deliberately outside the cluster, configured entirely as code)

Jenkins runs as its own `docker-compose` stack, not inside kind, and it has
**no kubeconfig and no cluster access at all.** That's the point: CI produces
artifacts and proposes desired state; only ArgoCD, running in-cluster, is
allowed to mutate the cluster. If asked "how do you stop CI from being a
backdoor into prod" — this is the answer.

Everything about Jenkins itself is defined in `infra/jenkins/casc/jenkins.yaml`
(JCasC) — security realm, the GitHub PAT credential, and all four pipeline
jobs are created automatically on boot. Nobody clicks through the setup
wizard.

Each service's `Jenkinsfile` (committed alongside its own code, not
centralized):
1. installs deps / lints (skipped for `frontend`, which builds via a
   multi-stage Dockerfile that runs its own `npm install`)
2. builds the Docker image, pushed to `kind-registry:5000` (Jenkins reaches
   the registry container directly, since it joins the same `kind` docker
   network rather than depending on Docker Desktop's host-networking mode)
3. bumps the image tag in `infra/k8s/base/<service>/deployment.yaml` to
   `localhost:5051/<service>:<tag>` — the hostname the *cluster* resolves,
   since kind's containerd mirrors `localhost:5051` to that same registry —
   and pushes that commit to `main`

**Trigger model:** SCM polling every ~2 minutes, not a webhook. GitHub can
only call a webhook on a publicly reachable URL, and this Jenkins runs on
`localhost` with no public address. Polling is the standard local-dev
substitute; in a real deployment this would be a GitHub webhook hitting
Jenkins' `/github-webhook/` endpoint for near-instant triggers instead.

## The full loop, end to end

```
dev pushes code to main
        |
        v
Jenkins polls, sees the change, builds + pushes image, commits new tag
        |
        v
ArgoCD polls the repo, sees the manifest changed
        |
        v
ArgoCD reconciles the cluster (prune + selfHeal enabled) to match git
        |
        v
new pods roll out; old ones terminate once new ones pass readiness probes
```

Two independent control loops, one shared source of truth. CI never
"deploys" anything — it only ever proposes, via a git commit.

## Local dev shortcut: docker-compose

`docker-compose.yml` at the repo root runs the same 7 containers (4
datastores + 3 backend services + frontend) without any of the k8s/ArgoCD/
Jenkins machinery, for fast iteration. Kept in sync with the k8s manifests
on env vars and ports, but is otherwise a separate, simpler path — not part
of the CI/CD story above.
