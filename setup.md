# VPS deployment

Use the production runbook in [`deploy/README.md`](deploy/README.md).

The application runs as two loopback-only services behind Nginx:

- `signaturepropertysolutions.com` -> Django/Gunicorn on `127.0.0.1:8000`
- `admin.signaturepropertysolutions.com` -> Next.js on `127.0.0.1:3000`

Do not run a plain `git pull` on an older production checkout. Earlier commits
tracked `.env`, `db.sqlite3`, and `images/`; the runbook backs them up and moves
runtime state to `/var/lib/sps` before updating the code.

The runbook also covers DNS and TLS setup, unprivileged systemd services,
Nginx configuration, repeatable deployments, readiness checks, backups, and
rollback.
