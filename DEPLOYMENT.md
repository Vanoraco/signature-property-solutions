# Production Deployment

This guide covers routine deployments to the existing production VPS. For a
new server, DNS, TLS, Nginx, systemd, or secret setup, use
[`deploy/README.md`](deploy/README.md).

## Production layout

| Item | Value |
| --- | --- |
| Git branch | `main` |
| VPS | `187.124.38.135` |
| SSH alias | `ssp` |
| Application | `/var/www/signature-property-solutions` |
| Persistent database | `/var/lib/sps/db.sqlite3` |
| Persistent media | `/var/lib/sps/media` |
| Django service | `sps-django.service` on `127.0.0.1:8000` |
| Admin service | `sps-admin.service` on `127.0.0.1:3000` |
| Public site | `https://signaturepropertysolutions.com` |
| Admin | `https://admin.signaturepropertysolutions.com` |

Production is deployed only from commits pushed to `origin/main`. Do not copy
source files, databases, or media to the VPS manually.

## 1. Review the local changes

Run these commands from the repository root in PowerShell:

```powershell
cd D:\Achi\Projects\signature-property-solutions
git status --short
git diff --check
git diff
```

Review migrations before deploying them:

```powershell
uv run python manage.py makemigrations --check --dry-run
uv run python manage.py showmigrations signatureapp
```

Never commit runtime or secret files, including:

- `.env` or production credentials
- `db.sqlite3`, `*.sqlite3.bak`, or other database copies
- uploaded media under `images/`
- local build output such as `.next/`, `node_modules/`, or `statics/`

Stage named files after reviewing `git status`. Avoid blindly staging every
untracked file when a database backup is present.

```powershell
git add path\to\changed-file path\to\migration-file
git diff --cached --check
git diff --cached --stat
```

## 2. Run local checks

Backend checks:

```powershell
uv run python manage.py check
uv run python manage.py test
```

Admin frontend checks:

```powershell
cd admin-frontend
npm test
npm run lint
npm run build
cd ..
```

The deployment will run migrations automatically. New migrations should be
backward-compatible with the previously deployed code so a code-only rollback
remains possible.

## 3. Commit and push `main`

```powershell
git status --short
git commit -m "describe the production change"
git push origin main
git status --short
git rev-parse --short HEAD
```

Do not deploy until the intended commit is visible on `origin/main` and the
local worktree contains no unintended staged or modified files.

## 4. Deploy to production

From the workstation:

```powershell
ssh ssp "sps-deploy"
```

If the SSH alias is unavailable:

```powershell
ssh root@187.124.38.135 "sps-deploy"
```

`sps-deploy` performs the complete release process:

1. Rejects a dirty production checkout or unsafe environment settings.
2. Creates a consistent database and media backup.
3. Fast-forwards the VPS checkout from `origin/main`.
4. Synchronizes locked Python dependencies.
5. Runs Django deployment checks, migrations, and `collectstatic`.
6. Installs locked admin dependencies and creates a production Next.js build.
7. Restarts Django and the admin service.
8. Verifies local services and both public HTTPS applications.

The admin is stopped briefly while its immutable build is replaced. Keep the
terminal open until `Deployment completed` and `All requested deployment
checks passed` are printed.

## 5. Verify the release

Run the server verification again:

```powershell
ssh ssp "sps-verify"
```

Check the public readiness endpoints:

```powershell
curl.exe -fsS https://signaturepropertysolutions.com/api/health/ready/
curl.exe -fsS https://admin.signaturepropertysolutions.com/api/health/ready
```

Both responses must contain:

```json
{"status":"ok"}
```

Confirm the same commit is local, pushed, and deployed:

```powershell
git rev-parse --short HEAD
ssh ssp "runuser -u sps -- git -C /var/www/signature-property-solutions rev-parse --short HEAD"
```

Finally, open the public site and admin dashboard and verify the workflows
changed by the release.

## Logs and troubleshooting

Service status:

```powershell
ssh ssp "systemctl status sps-django sps-admin --no-pager"
```

Recent application logs:

```powershell
ssh ssp "journalctl -u sps-django -u sps-admin -n 200 --no-pager"
```

Nginx errors:

```powershell
ssh ssp "tail -n 100 /var/log/nginx/error.log"
```

If deployment stops, read the first reported error. The deploy command keeps
the pre-deploy backup path in its output and attempts to restore the admin
service. Fix the cause and rerun `sps-deploy`; do not use `git reset --hard` on
the production checkout.

## Environment changes

Secrets and production-only values are stored outside Git:

- Django: `/etc/sps/django.env`
- Admin: `/etc/sps/admin.env`

Update those files on the VPS before deploying code that requires a new
variable. Keep the admin API server-to-server URL set to
`http://127.0.0.1:8000/api`. Never place production secrets in the repository.

## Rollback

To roll back code to the commit deployed before the latest release:

```powershell
ssh ssp "sps-rollback"
```

The normal rollback rebuilds the previous code but deliberately keeps the
current database and media. Do not use state restoration unless newer
production data can be discarded intentionally. After a rollback, the
checkout is detached by design; the next successful `sps-deploy` returns it to
`main`.

