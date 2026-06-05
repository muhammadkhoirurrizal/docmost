# Synology NAS Deployment Guide

Complete Docker setup for Docmost on Synology NAS with HTTPS via Nginx Proxy Manager.

## Prerequisites

- Synology NAS with Container Manager (Docker) installed
- A domain name (e.g., `docmost.yourdomain.com`)
- Port 80 and 443 forwarded on your router to your NAS IP

## Quick Start

### 1. Clone or Upload Code

Upload this project to your NAS (e.g., `/volume1/docker/docmost/`).

### 2. Configure Environment

Edit `docker-compose.synology.yml`:

```yaml
environment:
  APP_URL: https://docmost.yourdomain.com  # Your domain
  APP_SECRET: your-random-secret-32-chars   # Change this!
  JWT_SECRET: your-random-secret-32-chars   # Change this!
  POSTGRES_PASSWORD: STRONG_DB_PASSWORD     # Change this!
```

### 3. Create Docker Network

In DSM → **Container Manager** → **Network** → **Create**
- Name: `docmost-network`
- Driver: `bridge`

Or via SSH:
```bash
sudo docker network create docmost-network
```

### 4. Deploy

Via SSH:
```bash
cd /volume1/docker/docmost
docker compose -f docker-compose.synology.yml up -d
```

Or via Container Manager:
1. Open **Container Manager** → **Project**
2. Click **Create**
3. Path: `/volume1/docker/docmost`
4. Select `docker-compose.synology.yml`
5. Click **Next** → **Build and start**

### 5. Configure Nginx Proxy Manager

1. Open `http://YOUR_NAS_IP:81`
2. Default login:
   - Email: `admin@example.com`
   - Password: `changeme`
3. **Change the password immediately**

#### Add Proxy Host

1. Dashboard → **Hosts** → **Proxy Hosts** → **Add Proxy Host**
2. **Details:**
   - Domain Names: `docmost.yourdomain.com`
   - Forward Hostname / IP: `docmost`
   - Forward Port: `3000`
3. **SSL tab:**
   - SSL Certificate: **Request a new SSL Certificate**
   - ☑️ Force SSL
   - ☑️ HTTP/2 Support
   - ☑️ HSTS Enabled
   - ☑️ Agree to Let's Encrypt TOS
4. Click **Save**

### 6. DNS Setup

At your domain registrar/DNS provider:
- A-record: `docmost.yourdomain.com` → `YOUR_PUBLIC_IP`

### 7. Access

Open `https://docmost.yourdomain.com`

First signup creates the admin account.

---

## Router Port Forwarding

Forward these ports to your Synology NAS IP:

| External Port | Internal Port | Protocol | Purpose |
|--------------|---------------|----------|---------|
| 80 | 80 | TCP | Let's Encrypt validation |
| 443 | 443 | TCP | HTTPS traffic |

---

## Updating

```bash
cd /volume1/docker/docmost
docker compose -f docker-compose.synology.yml pull
docker compose -f docker-compose.synology.yml up -d
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `502 Bad Gateway` | Check Docmost container is running and on `docmost-network` |
| SSL certificate fails | Ensure port 80 is forwarded and accessible from internet |
| Can't reach NPM UI | Check DSM firewall isn't blocking port 81 |
| Domain not resolving | Wait for DNS propagation (can take up to 24h) |
| Build fails | Ensure enough RAM (4GB+ recommended) and disk space |

---

## File Structure

```
docmost/
├── docker-compose.yml              # Development compose
├── docker-compose.synology.yml     # Production compose for Synology
├── Dockerfile                      # Custom build
├── DEPLOY_SYNOLOGY.md              # This guide
└── ...
```

---

## Security Notes

- Change all default passwords (`APP_SECRET`, `JWT_SECRET`, `POSTGRES_PASSWORD`)
- Don't expose port 3000 or 5432 directly to the internet
- Keep your NAS and containers updated
- Enable 2FA on your Synology DSM account
