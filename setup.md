# Hostinger VPS Deployment Guide

## 1. Initial Server Setup

```bash
ssh root@your-vps-ip
apt update && apt upgrade -y
apt install nginx git curl -y
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

## 2. Clone the Project

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Vanoraco/signature-property-solutions.git
cd signature-property-solutions
```

## 3. Set Up Virtual Environment with uv

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

## 4. Create Environment File

```bash
nano .env
```

Add the following:

```
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,your-vps-ip
SITE_URL=https://your-domain.com
SITE_NAME=Signature Property Solutions
ADMIN_URL=your-secret-admin-path/   # change from default 'admin/' for security
```

Generate a secret key:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 5. Database and Static Files

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 6. Set Up Gunicorn

```bash
pip install gunicorn
```

Create the systemd service file:

```bash
nano /etc/systemd/system/sps.service
```

```ini
[Unit]
Description=Gunicorn for Signature Property Solutions
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/signature-property-solutions
ExecStart=/var/www/signature-property-solutions/.venv/bin/gunicorn signature.wsgi:application --bind 127.0.0.1:8000

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
systemctl daemon-reload
systemctl start sps
systemctl enable sps
```

## 7. Configure Nginx

```bash
nano /etc/nginx/sites-available/sps
```

```nginx
server {
    listen 80;
    server_name signaturepropertysolutions.com www.signaturepropertysolutions.com;

    client_max_body_size 10M;

    location /static/ {
        alias /var/www/signature-property-solutions/statics/;
    }

    location /images/ {
        alias /var/www/signature-property-solutions/images/;
    }

    location / {
        include proxy_params;
        proxy_pass http://127.0.0.1:8000;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/sps /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## 8. Domain DNS (Hostinger)

In Hostinger hPanel → DNS / Nameservers, ensure these records exist:

| Type  | Name | Value                            | TTL |
| ----- | ---- | -------------------------------- | --- |
| A     | @    | 187.124.38.135                   | 60  |
| CNAME | www  | signaturepropertysolutions.com | 300 |

## 9. SSL Certificate

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d signaturepropertysolutions.com -d www.signaturepropertysolutions.com
```

## 10. Deploying Updates

After pushing new code from local:

```bash
cd /var/www/signature-property-solutions
git pull
source .venv/bin/activate
uv pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
systemctl restart sps
```

## Troubleshooting

- **Static files not loading**: Run `python manage.py collectstatic --noinput` and check the Nginx static alias path
- **Images not loading**: Check Nginx has `location /images/` mapped to the correct directory
- **502 Bad Gateway**: Gunicorn is not running. Check with `systemctl status sps` and restart with `systemctl restart sps`
- **Permission errors**: `chmod -R 755 /var/www/signature-property-solutions/images/`
- **Check Gunicorn logs**: `journalctl -u sps -f`
- **Check Nginx logs**: `tail -f /var/log/nginx/error.log`
