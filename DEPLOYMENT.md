# Deployment Guide

## Overview

This guide covers deploying the i4ops Dashboard to production environments.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- PM2 (for process management)
- SSH access to target server

## Quick Deployment

```bash
# Deploy to remote server
./deploy.sh production your-server-ip manual

# Deploy locally
./deploy.sh local localhost manual
```

## Manual Deployment

### 1. Server Setup

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install PM2
npm install -g pm2
```

### 2. Database Setup

```bash
# Create database user
sudo -u postgres createuser -s i4ops
sudo -u postgres createdb i4ops_dashboard
sudo -u postgres psql -c "ALTER USER i4ops PASSWORD 'your_password';"
```

### 3. Application Deployment

```bash
# Clone repository
git clone <repository-url>
cd i4ops-dashboard

# Configure environment
cp .env.example .env
# Edit .env with your actual values

# Setup backend
cd server
npm install
npm run build
npm run prisma:migrate
npm run populate:hosts

# Setup frontend
cd ../dashboard
npm install
npm run build
```

### 4. Start Services

```bash
# Start backend with PM2
cd server
pm2 start dist/index.js --name i4ops-backend

# Serve frontend (choose one)
cd ../dashboard

# Option 1: Simple HTTP server
python3 -m http.server 8888

# Option 2: Nginx (recommended for production)
sudo cp nginx/nginx.conf /etc/nginx/sites-available/i4ops-dashboard
sudo ln -s /etc/nginx/sites-available/i4ops-dashboard /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

## Configuration

### Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://i4ops:password@localhost:5432/i4ops_dashboard

# SSH (for VM monitoring)
SSH_USER=i4ops
SSH_PASSWORD=your_ssh_password

# Tailscale (for host discovery)
TS_OAUTH_CLIENT_ID=your_client_id
TS_OAUTH_CLIENT_SECRET=your_client_secret
TAILNET=your_tailnet

# Supabase (for authentication)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Nginx Configuration

For production, configure nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Checks

```bash
# API health
curl http://your-server:4000/api/health

# Frontend health
curl http://your-server:8888

# PM2 status
pm2 status
pm2 logs i4ops-backend
```

### Logs

- Backend logs: `pm2 logs i4ops-backend`
- Frontend logs: Browser developer console
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check PostgreSQL status: `sudo systemctl status postgresql`
   - Verify DATABASE_URL in .env
   - Run migrations: `npm run prisma:migrate`

2. **Frontend can't connect to API**
   - Verify backend is running: `pm2 status`
   - Check CORS configuration
   - Verify API URL in frontend .env

3. **Host polling not working**
   - Check SSH credentials
   - Verify Tailscale OAuth configuration
   - Run host population: `npm run populate:hosts`

### Performance Optimization

- Enable gzip compression in nginx
- Configure database connection pooling
- Use PM2 cluster mode for multiple backend instances
- Implement caching for static assets

## Security

- Use strong passwords for database and SSH
- Configure firewall rules
- Enable SSL/TLS with Let's Encrypt
- Regularly update dependencies
- Monitor audit logs

## Backup

### Database Backup

```bash
# Create backup
pg_dump -U i4ops i4ops_dashboard > backup.sql

# Restore backup
psql -U i4ops i4ops_dashboard < backup.sql
```

### Application Backup

```bash
# Backup application files
tar -czf i4ops-backup-$(date +%Y%m%d).tar.gz \
    /path/to/i4ops-dashboard \
    --exclude=node_modules \
    --exclude=dist
``` 