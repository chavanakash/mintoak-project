# mintoak-project

A learning clone of a merchant-commerce SaaS platform (inspired by Mintoak's
bank → merchant payment-enablement model), built to practice a realistic
DevOps stack: containerized microservices, Kubernetes, GitOps with ArgoCD,
and CI with Jenkins. No cloud provider — everything runs locally on `kind`.

## Why this shape

Mintoak connects **banks → merchants → payments**. This project mirrors that
with three backend services instead of one monolith, because that's where
the interesting DevOps problems live (independent deploys, service-to-service
networking, per-service scaling, async events):

| Service | Responsibility | Talks to |
|---|---|---|
| `merchant-service` | Merchant onboarding & profile CRUD | PostgreSQL |
| `transaction-service` | Records payment transactions, emits events | PostgreSQL, Kafka (producer) |
| `notification-service` | Consumes transaction events, updates analytics feed + cache | Kafka (consumer), MongoDB, Redis |
| `frontend` | Merchant dashboard (React) | merchant-service, transaction-service (via Ingress) |

**Why 4 datastores:** each one is doing the job it's actually good at, not
just "because we can":
- **PostgreSQL** — transactional data that needs integrity (merchants, transactions)
- **Redis** — hot-path cache (e.g. merchant transaction-count / stats lookups)
- **Kafka** — decouples "a transaction happened" from "who cares and what they do about it"
- **MongoDB** — semi-structured analytics/event documents fed by the Kafka consumer

## Repo layout

```
mintoak-project/
├── frontend/                  React + Vite merchant dashboard
├── backend/
│   ├── merchant-service/      NestJS, Postgres
│   ├── transaction-service/   NestJS, Postgres + Kafka producer
│   └── notification-service/  Node, Kafka consumer -> Mongo + Redis
├── infra/
│   ├── kind/                  local cluster config + local registry setup
│   ├── k8s/                   raw manifests (kustomize base)
│   ├── argocd/                App-of-apps GitOps definitions
│   └── jenkins/                docker-compose Jenkins + per-service Jenkinsfiles live in each service dir
└── docker-compose.yml         fastest way to run the whole stack locally without k8s
```

## Two ways to run this

### 1. Fast local sanity check (docker-compose, no k8s)
```
docker compose up --build
```
- frontend: http://localhost:5173
- merchant-service: http://localhost:3001/health
- transaction-service: http://localhost:3002/health

### 2. The real thing: kind + ArgoCD + Jenkins (GitOps)
```
cd infra/kind
./setup-cluster.sh          # creates kind cluster + local registry + ingress-nginx
cd ../argocd
./install.sh                # installs ArgoCD, applies the root (app-of-apps) Application
cd ../jenkins
docker compose -f docker-compose.jenkins.yml up -d   # CI server, builds & pushes images, bumps image tags in git
```
Flow: **push to git → Jenkins builds image, pushes to local registry, commits
new tag → ArgoCD detects the git change → syncs the cluster.** Jenkins never
talks to the cluster directly — that's the GitOps split: CI produces
artifacts, CD (ArgoCD) reconciles desired state from git. This is deliberate
and mirrors how most real orgs separate the two concerns.

See `infra/kind/README.md`, `infra/argocd/README.md`, and
`infra/jenkins/README.md` for the details of each piece.
