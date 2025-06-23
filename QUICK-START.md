# 🚀 **i4ops Dashboard - Quick Start (Easy Button)**

## **⚡ 30-Second Deploy**

```bash
# 1. Clone & Configure
git clone <your-repo-url>
cd i4ops-dashboard
cp .env.example .env

# 2. Edit .env (required)
nano .env  # Set your DEPLOYMENT_HOST, DB_PASSWORD, SSH_PASSWORD, etc.

# 3. Deploy (pick one)
./deploy.sh local localhost docker        # 🏠 Local development
./deploy.sh production 192.168.1.100 docker  # 🌐 Remote server
```

**Done! 🎉**
- Dashboard: `http://your-server:8888`
- API: `http://your-server:4000`

---

## **📋 Prerequisites (One-Time Setup)**

### **Local Development**
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout/login to apply group changes
```

### **Remote Server**
```bash
# On your server, install Docker
ssh your-user@your-server
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

## **🔧 Essential Configuration**

Edit `.env` with your values:
```bash
# Required Settings
DEPLOYMENT_HOST=192.168.1.100      # Your server IP
DB_PASSWORD=secure_password123     # Strong database password
SSH_PASSWORD=your_ssh_password     # For VM monitoring

# Optional (for full features)
TS_OAUTH_CLIENT_ID=your_tailscale_id
TS_OAUTH_CLIENT_SECRET=your_tailscale_secret
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

## **🎯 Common Commands**

### **Deploy & Manage**
```bash
# Deploy to server
./deploy.sh production 192.168.1.100 docker

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update application
git pull && ./deploy.sh production 192.168.1.100 docker
```

### **Health Checks**
```bash
# Quick health check
curl http://192.168.1.100:4000/api/health   # API
curl http://192.168.1.100:8888              # Frontend

# Detailed status
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### **Database Operations**
```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Backup database
docker-compose exec postgres pg_dump -U i4ops i4ops_dashboard > backup.sql

# Restore database
docker-compose exec -T postgres psql -U i4ops i4ops_dashboard < backup.sql
```

---

## **🆘 Quick Troubleshooting**

### **Can't Connect to Dashboard**
```bash
# 1. Check services are running
docker-compose ps

# 2. Check logs for errors
docker-compose logs frontend
docker-compose logs backend

# 3. Verify firewall
sudo ufw status
sudo ufw allow 8888/tcp
```

### **Database Issues**
```bash
# Reset database
docker-compose down
docker volume rm i4ops-dashboard_postgres_data
docker-compose up -d
```

### **Environment Issues**
```bash
# Verify environment variables
docker-compose exec backend printenv | grep -E "(DATABASE_URL|SSH_)"
```

---

## **🔄 Update Process**

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and deploy
./deploy.sh production your-server-ip docker

# 3. Verify update
curl http://your-server-ip:4000/api/health
```

---

## **📞 Need Help?**

1. **Check logs**: `docker-compose logs`
2. **Read full guide**: `DEPLOYMENT.md`
3. **Check service status**: `docker-compose ps`
4. **Test connectivity**: `curl http://your-server:4000/api/health`

---

## **⚙️ Alternative Deployments**

### **Without Docker (PM2)**
```bash
# Install Node.js 18+ and PostgreSQL first
./deploy.sh production your-server-ip manual
```

### **System Services**
```bash
# Copy service files and enable
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl enable i4ops-backend i4ops-frontend
sudo systemctl start i4ops-backend i4ops-frontend
```

---

## **🎉 That's It!**

Your i4ops Dashboard should now be running at:
- **Dashboard**: `http://your-server:8888`
- **API**: `http://your-server:4000`

For advanced configuration, see `DEPLOYMENT.md` 