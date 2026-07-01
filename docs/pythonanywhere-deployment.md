# PythonAnywhere Deployment Guide

## Static Files Issue

PythonAnywhere does **not** automatically serve Django static files. After every code push, static assets (CSS, JS, images) will be missing unless you follow these steps.

## Root Cause

- `STATIC_ROOT = BASE_DIR / 'statics'` in `settings.py`
- `statics/` is in `.gitignore` — not pushed to GitHub
- PythonAnywhere needs a manual `collectstatic` run + static file mapping to serve them

## Steps After Every Deploy

1. Open PythonAnywhere **Bash console**
2. Run:
   ```bash
   cd ~/signature-property-solutions
   git pull
   python manage.py collectstatic --noinput
   ```
3. Go to **Dashboard → Web** tab
4. Click **Reload** on your web app

## One-Time Setup (Static File Mapping)

If not already configured:

1. Go to **Dashboard → Web** tab
2. Scroll to **Static files**
3. Add this mapping:

   | URL     | Directory                                       |
   |---------|-------------------------------------------------|
   | `/static/` | `/home/<your-username>/signature-property-solutions/statics/` |

4. Click **Reload**

## Template Files

Template changes (`template/`) take effect immediately after `git pull` + Reload — no `collectstatic` needed for templates.
