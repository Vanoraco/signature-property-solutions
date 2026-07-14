# Ubuntu VPS deployment

Production layout:

| Public endpoint | Nginx upstream | Service |
| --- | --- | --- |
| `https://signaturepropertysolutions.com` | `127.0.0.1:8000` | Django/Gunicorn |
| `https://admin.signaturepropertysolutions.com` | `127.0.0.1:3000` | Next.js admin |

Application code lives at `/var/www/signature-property-solutions`, persistent
SQLite/media state at `/var/lib/sps`, secrets at `/etc/sps`, and backups at
`/var/backups/sps`. Ports 3000 and 8000 bind only to loopback.

## Critical first-rollout safeguard

Do **not** run a normal `git pull` on the existing VPS checkout yet. Older
commits track `.env`, `db.sqlite3`, and some files under `images/`; the new
commit removes runtime state from Git. Back up and externalize that state
first. Also rotate the Django secret and all administrator passwords because
the old secret was previously committed.

Use a maintenance window and pause writes through the old admin while taking
the first snapshot:

```bash
export APP=/var/www/signature-property-solutions
export PRE=/var/backups/sps-pre-admin-$(date -u +%Y%m%dT%H%M%SZ)

id sps >/dev/null 2>&1 || sudo adduser --system --group --home /var/lib/sps --no-create-home sps
sudo chown -R sps:www-data "$APP"
sudo install -d -m 0750 -o sps -g www-data /var/lib/sps /var/lib/sps/media
sudo install -d -m 0700 "$PRE"
sudo sqlite3 "$APP/db.sqlite3" ".timeout 10000" ".backup '$PRE/db.sqlite3'"
sudo tar -C "$APP/images" -czf "$PRE/media.tar.gz" .
sudo sqlite3 "$APP/db.sqlite3" ".timeout 10000" ".backup '/var/lib/sps/db.sqlite3'"
sudo rsync -a "$APP/images/" /var/lib/sps/media/
sudo chown -R sps:www-data /var/lib/sps
sudo chmod 0750 /var/lib/sps /var/lib/sps/media
sudo chmod 0640 /var/lib/sps/db.sqlite3
```

Confirm both database snapshots before proceeding:

```bash
sudo sqlite3 "$PRE/db.sqlite3" 'PRAGMA integrity_check;'
sudo sqlite3 /var/lib/sps/db.sqlite3 'PRAGMA integrity_check;'
```

Both commands must print `ok`. Keep the pre-admin snapshot and the legacy
service definition until the first deployment has been verified. Stop the
legacy application service, then stash only the tracked runtime paths now that
their external copies are safe:

```bash
sudo -u sps git -C "$APP" stash push -m 'externalized runtime state before admin rollout' -- .env db.sqlite3 images
sudo -u sps git -C "$APP" status --short
```

Resolve any remaining tracked changes before deployment. Do not restart the
legacy service against the stashed database; the new service will use the copy
under `/var/lib/sps`.

## 1. Prerequisites

Use Ubuntu 24.04 or an equivalent host with Python 3.12 and Node.js 22 LTS
(minimum 20.19). Install Node system-wide so npm is available at
`/usr/bin/npm`. Also install Nginx, Certbot, Git, `sqlite3`, `rsync`, `curl`,
and `uv`. Install `uv` in `/usr/local/bin` so the `sps` user can execute it.
Verify rather than assuming:

```bash
python3.12 --version
/usr/bin/node --version
/usr/bin/npm --version
/usr/local/bin/uv --version
nginx -v
```

Create the unprivileged service account and directories if they do not exist:

```bash
id sps >/dev/null 2>&1 || sudo adduser --system --group --home /var/lib/sps --no-create-home sps
sudo install -d -m 0750 -o sps -g www-data /var/lib/sps /var/lib/sps/media
sudo install -d -m 0750 -o sps -g www-data /var/www/signature-property-solutions
sudo install -d -m 0750 -o root -g sps /etc/sps
sudo install -d -m 0700 -o root -g root /var/backups/sps
sudo install -d -m 0755 -o root -g root /var/www/letsencrypt
sudo chown -R sps:www-data /var/www/signature-property-solutions
```

If the account already exists, skip `adduser`. Allow inbound traffic only on
SSH, 80, and 443; do not expose 3000 or 8000 in the firewall.

## 2. Install tools without pulling

Fetch is safe because it does not alter the checked-out database or media.
Extract only `deploy/` from the fetched commit, then install the commands:

```bash
export APP=/var/www/signature-property-solutions
export DEPLOY_TMP=$(mktemp -d)

sudo -u sps git -C "$APP" fetch origin main
sudo -u sps git -C "$APP" archive origin/main deploy | sudo tar -x -C "$DEPLOY_TMP"
sudo install -d -m 0755 /usr/local/lib/sps-deploy
sudo install -m 0644 "$DEPLOY_TMP/deploy/scripts/common.sh" /usr/local/lib/sps-deploy/common.sh
sudo install -m 0755 "$DEPLOY_TMP/deploy/scripts/sps-backup" /usr/local/sbin/sps-backup
sudo install -m 0755 "$DEPLOY_TMP/deploy/scripts/sps-deploy" /usr/local/sbin/sps-deploy
sudo install -m 0755 "$DEPLOY_TMP/deploy/scripts/sps-verify" /usr/local/sbin/sps-verify
sudo install -m 0755 "$DEPLOY_TMP/deploy/scripts/sps-rollback" /usr/local/sbin/sps-rollback
```

The deployment command later refreshes these installed copies only after a
successful rollout.

## 3. Configure secrets and services

Install the examples, then edit them in place. Use a newly generated secret;
never reuse the value from the repository's old `.env`.

```bash
sudo install -m 0640 -o root -g sps "$DEPLOY_TMP/deploy/env/django.env.example" /etc/sps/django.env
sudo install -m 0640 -o root -g sps "$DEPLOY_TMP/deploy/env/admin.env.example" /etc/sps/admin.env
sudo install -m 0644 "$DEPLOY_TMP/deploy/runtime/sps_settings.py" /etc/sps/sps_settings.py
sudo install -m 0644 "$DEPLOY_TMP/deploy/runtime/sps_auth.py" /etc/sps/sps_auth.py
sudoedit /etc/sps/django.env
sudoedit /etc/sps/admin.env
sudo install -m 0644 "$DEPLOY_TMP/deploy/systemd/sps-django.service" /etc/systemd/system/sps-django.service
sudo install -m 0644 "$DEPLOY_TMP/deploy/systemd/sps-admin.service" /etc/systemd/system/sps-admin.service
sudo systemctl daemon-reload
sudo systemctl enable sps-django.service sps-admin.service
```

A suitable secret can be generated with `openssl rand -hex 48`. Store it only
in `/etc/sps/django.env`. The admin frontend talks to Django server-to-server
through `DJANGO_API_URL=http://127.0.0.1:8000/api`; do not publish that loopback
URL as a browser environment variable.

## 4. DNS, TLS, and Nginx

Create this DNS record and wait for it to resolve publicly:

```text
admin  A  187.124.38.135
```

If the main site already has a working certificate, use only the admin
bootstrap vhost to issue the new admin certificate:

```bash
sudo install -m 0644 "$DEPLOY_TMP/deploy/nginx/admin-http-bootstrap.conf" /etc/nginx/sites-available/sps-admin-bootstrap
sudo ln -s /etc/nginx/sites-available/sps-admin-bootstrap /etc/nginx/sites-enabled/sps-admin-bootstrap
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/letsencrypt -d admin.signaturepropertysolutions.com
sudo rm /etc/nginx/sites-enabled/sps-admin-bootstrap
```

For a completely fresh server, use `http-bootstrap.conf` instead and issue one
certificate for the main and `www` names plus a second certificate for admin.
Check the resulting certificate names with `sudo certbot certificates`; update
the two Nginx certificate paths if Certbot selected suffixed names.

Back up any existing live vhost, install the final configurations, and validate
the complete Nginx configuration before reloading:

```bash
sudo cp -a /etc/nginx/sites-available/signaturepropertysolutions.com /etc/nginx/sites-available/signaturepropertysolutions.com.pre-admin 2>/dev/null || true
sudo install -m 0644 "$DEPLOY_TMP/deploy/nginx/signaturepropertysolutions.com.conf" /etc/nginx/sites-available/signaturepropertysolutions.com
sudo install -m 0644 "$DEPLOY_TMP/deploy/nginx/admin.signaturepropertysolutions.com.conf" /etc/nginx/sites-available/admin.signaturepropertysolutions.com
sudo ln -sfn /etc/nginx/sites-available/signaturepropertysolutions.com /etc/nginx/sites-enabled/signaturepropertysolutions.com
sudo ln -sfn /etc/nginx/sites-available/admin.signaturepropertysolutions.com /etc/nginx/sites-enabled/admin.signaturepropertysolutions.com
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

## 5. First and routine deployments

Stop or disable any old application service that owns port 8000 immediately
before the first rollout. The new deploy command performs these gates in order:

1. Rejects local checkout changes and unsafe production settings.
2. Creates a consistent SQLite backup plus a media archive before any pull.
3. Fetches and accepts only a fast-forward update from `origin/main`.
4. Runs `uv sync --frozen --no-dev`, Django deployment checks, migrations, and
   `collectstatic`.
5. Briefly stops the admin, runs `npm ci --include=dev` and `npm run build`,
   then restarts both systemd services.
6. Verifies both local services, the database-backed readiness endpoint, the
   Next API proxy, and both public HTTPS hosts.

Run it with:

```bash
sudo sps-deploy
```

Use `sudo sps-deploy --skip-public-verify` only during initial DNS/TLS setup.
For a genuinely empty installation with no legacy database, add
`--allow-empty-state`; never use that flag to work around a missing production
database.

## Verification and logs

```bash
sudo sps-verify
sudo systemctl status sps-django sps-admin --no-pager
sudo journalctl -u sps-django -u sps-admin -n 200 --no-pager
sudo nginx -t
curl -fsS https://signaturepropertysolutions.com/api/health/ready/
curl -fsS https://admin.signaturepropertysolutions.com/api/health/ready
```

The health responses must contain `{"status":"ok"}`. Direct local Django
checks must include `X-Forwarded-Proto: https` because production Django
redirects plain HTTP; `sps-verify` already handles this.

After the first successful rollout, rotate each staff/admin password and log in
again so previously issued sessions and JWTs are no longer trusted.

## Backup and rollback

Create an on-demand backup at any time:

```bash
sudo sps-backup
```

Each backup is an immutable directory containing a SQLite online snapshot,
media archive, manifest, and SHA-256 checksums. Copy backups off the VPS and
apply an external retention policy; the scripts never delete them.

For deployments made after this baseline, the default rollback returns code
and dependencies to the commit recorded by the pre-deploy backup, but
deliberately leaves the current database and media in place:

```bash
sudo sps-rollback
# or select a specific backup
sudo sps-rollback --backup /var/backups/sps/<backup-directory>
```

The one-time rollback to the validated pre-deployment commit `b44b491` is
different: it has unreproducible lockfiles, repository-local state paths, no
readiness endpoint, and weaker API authorization. The compatibility path therefore
requires an explicit flag, preserves the known-good Python environment and
compiled Next artifact, keeps external state through the deployment settings
overlay, and enforces staff-only JWT authentication outside the old code:

```bash
sudo sps-rollback --allow-compatibility-runtime
```

This is an emergency backend/source rollback, not an equivalent rebuild of the
old admin. Keep the legacy VPS snapshot until the first rollout is accepted; if
the failure is in the compiled admin itself, restore that snapshot instead.

Only restore old state when data loss is explicitly accepted. This preserves
the replaced database and media beside their runtime paths and also takes a
fresh rescue backup first:

```bash
sudo env CONFIRM_STATE_RESTORE=YES sps-rollback \
  --backup /var/backups/sps/<backup-directory> \
  --restore-state
```

Database migrations must remain backward-compatible for code-only rollback.
Never automatically reverse a destructive migration. After rollback Git is
intentionally detached at the restored commit; the next `sudo sps-deploy`
switches back to `main` and performs a fast-forward-only pull.
