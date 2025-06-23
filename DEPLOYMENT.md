# 🚀 **i4ops Dashboard - Production Deployment Guide**

## 📋 **Overview**

This guide provides comprehensive deployment options for the i4ops Dashboard to any server. The application has been enhanced with Docker support, improved security, and production-ready configurations.

## 🔧 **What We Fixed**

### ✅ **Major Improvements**
- **🐳 Docker Support**: Full containerization with Docker Compose
- **🔒 Security**: Non-root containers, secure environment variables
- **🏗️ Database**: Proper PostgreSQL setup and migrations
- **🌐 Nginx**: Production-ready reverse proxy
- **📊 Monitoring**: Health checks and logging
- **🔄 Process Management**: Systemd services and PM2 support
- **⚡ Zero-Downtime**: Backup and rollback capabilities

### ❌ **Issues Resolved**
- Hardcoded database URL in Prisma schema
- Missing Docker configurations
- Insecure environment variable handling
- No database migration strategy
- Limited process management
- No comprehensive health checks

---

## 🚀 **Quick Start Deployment**

### **Option 1: Docker Deployment (Recommended)**

```bash
# 1. Clone and configure
git clone <repository-url>
cd i4ops-dashboard

# 2. Set up environment
cp .env.example .env
# Edit .env with your actual values

# 3. Deploy locally
./deploy.sh local localhost docker

# 4. Deploy to remote server
./deploy.sh production 192.168.1.100 docker
```

### **Option 2: Manual Deployment**

```bash
# Deploy without Docker
./deploy.sh production 192.168.1.100 manual
```

---

## 🛠️ **Environment Configuration**

### **1. Copy Environment Template**
```bash
cp .env.example .env
```

### **2. Configure Required Variables**

```env
# Deployment Configuration
NODE_ENV=production
DEPLOYMENT_HOST=192.168.1.100

# Database Configuration
DATABASE_URL=postgresql://i4ops:secure_password@localhost:5432/i4ops_dashboard
DB_PASSWORD=secure_password

# SSH Configuration (for VM monitoring)
SSH_USER=i4ops
SSH_PASSWORD=your_ssh_password
U0_IP=100.76.195.14

# Tailscale OAuth (for network monitoring)
TS_OAUTH_CLIENT_ID=your_client_id
TS_OAUTH_CLIENT_SECRET=your_client_secret
TAILNET=your_tailnet

# Supabase Authentication
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🐳 **Docker Deployment (Recommended)**

### **Features**
- ✅ Isolated containers for each service
- ✅ Automatic health checks
- ✅ Database migrations
- ✅ Production-ready Nginx reverse proxy
- ✅ Volume persistence for data
- ✅ Easy scaling and updates

### **Services Included**
- **PostgreSQL**: Database with automatic initialization
- **Backend**: Node.js API server
- **Frontend**: React dashboard with Nginx
- **Nginx**: Reverse proxy (optional, for production)

### **Local Development**
```bash
# Start all services
./deploy.sh local localhost docker

# Access services
# Dashboard: http://localhost:8888
# API: http://localhost:4000
# Database: localhost:5432
```

### **Production Deployment**
```bash
# Deploy to remote server
./deploy.sh production your.server.ip docker

# With nginx reverse proxy
docker-compose --profile production up -d
```

### **Docker Commands**
```bash
# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Update services
docker-compose pull && docker-compose up -d

# Database migrations
docker-compose exec backend npx prisma migrate deploy

# Backup database
docker-compose exec postgres pg_dump -U i4ops i4ops_dashboard > backup.sql
```

---

## 📦 **Manual Deployment**

### **Prerequisites**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install PM2 for process management
npm install -g pm2
```

### **Database Setup**
```bash
# Create database user
sudo -u postgres createuser -s i4ops
sudo -u postgres createdb i4ops_dashboard
sudo -u postgres psql -c "ALTER USER i4ops PASSWORD 'your_password';"
```

### **Deployment Steps**
```bash
# Deploy application
./deploy.sh production your.server.ip manual

# SSH to server and verify
ssh i4ops@your.server.ip
pm2 status
pm2 logs
```

---

## ⚙️ **Systemd Services (Alternative)**

For systemd-based process management:

### **Installation**
```bash
# Copy service files
sudo cp systemd/*.service /etc/systemd/system/

# Enable and start services
sudo systemctl enable i4ops-backend i4ops-frontend
sudo systemctl start i4ops-backend i4ops-frontend

# Check status
sudo systemctl status i4ops-backend
sudo systemctl status i4ops-frontend
```

### **Management**
```bash
# Start/stop services
sudo systemctl start i4ops-backend
sudo systemctl stop i4ops-backend

# View logs
sudo journalctl -u i4ops-backend -f
sudo journalctl -u i4ops-frontend -f

# Restart services
sudo systemctl restart i4ops-backend
```

---

## 🌐 **Production Nginx Configuration**

### **With Docker**
Nginx is automatically configured when using the production profile:
```bash
docker-compose --profile production up -d
```

### **Manual Nginx Setup**
```bash
# Install Nginx
sudo apt-get install nginx

# Copy configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/i4ops-dashboard
sudo ln -s /etc/nginx/sites-available/i4ops-dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 **Health Checks & Monitoring**

### **Application Health**
```bash
# API health check
curl http://your.server.ip:4000/api/health

# Frontend health check
curl http://your.server.ip:8888/health

# Nginx health check (if using reverse proxy)
curl http://your.server.ip/nginx-health
```

### **Service Status**
```bash
# Docker deployment
docker-compose ps
docker-compose logs backend
docker-compose logs frontend

# Manual deployment
pm2 status
pm2 logs i4ops-backend
pm2 logs i4ops-frontend

# Systemd deployment
sudo systemctl status i4ops-backend i4ops-frontend
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**1. Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify database exists
sudo -u postgres psql -l | grep i4ops

# Test connection
docker-compose exec backend npx prisma db ping
```

**2. Frontend Can't Connect to API**
```bash
# Check backend is running
curl http://localhost:4000/api/health

# Verify CORS configuration in server/src/app.ts
# Check environment variables in frontend
```

**3. Docker Build Issues**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

**4. Permission Issues**
```bash
# Fix ownership
sudo chown -R i4ops:i4ops /home/i4ops/i4ops-dashboard

# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
```

### **Logs Location**
- **Docker**: `docker-compose logs`
- **PM2**: `~/.pm2/logs/`
- **Systemd**: `sudo journalctl -u service-name`
- **Nginx**: `/var/log/nginx/`

---

## 🔒 **Security Considerations**

### **Environment Variables**
- Never commit `.env` files to version control
- Use strong passwords for database and SSH
- Rotate Tailscale OAuth tokens regularly

### **Network Security**
```bash
# Configure firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### **SSL/TLS (Production)**
```bash
# Install Certbot for Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 📊 **Performance Optimization**

### **Docker Optimization**
- Use multi-stage builds (already implemented)
- Implement container resource limits
- Use Docker secrets for sensitive data

### **Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX idx_vm_status ON "VM"(status);
CREATE INDEX idx_host_status ON "Host"(status);
CREATE INDEX idx_poll_history_time ON "PollHistory"(time);
```

### **Nginx Optimization**
- Enable gzip compression (already configured)
- Implement caching for static assets
- Configure rate limiting (already implemented)

---

## 🔄 **Backup & Recovery**

### **Database Backup**
```bash
# Docker deployment
docker-compose exec postgres pg_dump -U i4ops i4ops_dashboard > backup.sql

# Manual deployment
pg_dump -U i4ops i4ops_dashboard > backup.sql

# Automated backup script
./scripts/backup.sh
```

### **Application Backup**
```bash
# Full application backup
tar -czf i4ops-backup-$(date +%Y%m%d).tar.gz \
    /home/i4ops/i4ops-dashboard \
    --exclude=node_modules \
    --exclude=dist
```

### **Recovery**
```bash
# Restore database
docker-compose exec -T postgres psql -U i4ops i4ops_dashboard < backup.sql

# Rollback application
mv /home/i4ops/i4ops-dashboard/current /home/i4ops/i4ops-dashboard/failed
mv /home/i4ops/i4ops-dashboard/backup-YYYYMMDD-HHMMSS /home/i4ops/i4ops-dashboard/current
```

---

## 🎯 **Next Steps**

### **Production Checklist**
- [ ] Set up SSL certificates
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Implement log aggregation
- [ ] Set up automated backups
- [ ] Configure alerts
- [ ] Implement CI/CD pipeline
- [ ] Set up staging environment
- [ ] Document rollback procedures

### **Scaling Considerations**
- Load balancer for multiple backend instances
- Database read replicas
- Redis for session storage
- CDN for static assets

---

## 📞 **Support**

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Test individual components

**Deployment Script Help**
```bash
./deploy.sh --help
```

**Service Status**
```bash
# Docker
docker-compose ps

# Manual
pm2 status

# Systemd
sudo systemctl status i4ops-*
``` 