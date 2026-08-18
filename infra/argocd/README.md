# ArgoCD (GitOps)

This uses the **app-of-apps** pattern: one root `Application`
(`apps/root-app.yaml`) points at the `infra/argocd/apps/` directory in this
repo. ArgoCD syncs that directory, which itself contains one `Application`
per deployable unit (databases, each backend service, frontend). Add a new
service by adding one more Application file here — no changes needed to the
root app.

**Before this works**, edit `apps/root-app.yaml` and every file in `apps/`
to point `spec.source.repoURL` at wherever you push this repo (GitHub/GitLab/
local git server) — ArgoCD needs to fetch it over git, it can't read your
local filesystem.

```
./install.sh
```

Flow once installed:
1. Jenkins builds an image, pushes it to `localhost:5001`, and commits the
   new tag into `infra/k8s/base/<service>.yaml` on `main`.
2. ArgoCD's controller polls the git repo (default every 3 min, or
   immediately if you set up a webhook) and notices the manifest changed.
3. ArgoCD reconciles the live cluster state to match — i.e. it does the
   `kubectl apply` for you and reports drift/health in the UI.

This is the core GitOps idea worth being able to explain in an interview:
**Jenkins never runs `kubectl apply`.** CI's job ends at "produce an image
and record its tag in git." CD is a separate control loop that treats git as
the single source of truth and continuously reconciles toward it — so the
cluster state is always just "whatever git says," auditable and revertible
with a `git revert`.
