# Dev deployment — https://devapi.wayout.uz

Runs on the shared server behind `global-nginx` (`/root/infra`), which reaches the containers over the
`gateway_net` Docker network and terminates TLS (Let's Encrypt, renewed by the `renew-certs.sh` cron).

Services: `db` (Postgres 17), `s3` (SeaweedFS, S3-compatible; MinIO no longer publishes images), one-shot `s3-init` (bucket) and `migrate` (`prisma migrate deploy`), `api`.
Lesson media is public at `https://devapi.wayout.uz/media/irbis-media/lessons/...`; nothing else in the bucket is exposed.

First-time setup on the server:

```bash
cp deploy/.env.example deploy/.env   # fill in real values; chmod 600
cd deploy && docker compose up -d --build
docker compose run --rm --no-deps migrate npx prisma db seed   # once; it overwrites edited places
docker compose run --rm --no-deps -it migrate npm run admin:create   # first admin, interactive
```

## CI/CD (`.github/workflows/ci-cd.yml`)

- Every pull request and push: `npm ci`, `npm run check`, `npm run build`.
- Push to `main`: after the checks pass, SSH to the server, which runs `/root/deploy.sh irbis-api`
  (git pull, `docker compose build`, `docker compose up -d`), then polls the public URL.

The deploy key is restricted on the server by a forced command (`/root/irbis/deploy-gate.sh`): it can only
deploy `irbis-api` or `irbis-web`. GitHub repo settings (Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | private key of the deploy key (`/root/.ssh/irbis_github_deploy` on the server) |
| Variable | `DEPLOY_HOST` | server IP |
| Variable | `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <server IP>` |
| Variable | `DEPLOY_USER` | optional, defaults to `root` |

Until `DEPLOY_HOST` is set the deploy job is skipped and only the checks run.
