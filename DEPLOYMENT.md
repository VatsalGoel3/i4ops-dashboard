# 🚀 Deployment Guide for i4ops Dashboard

## 🎯 **Fixed: The Localhost Hell**

Your dashboard was **hardcoded to localhost** everywhere, making deployment impossible. Here's what I fixed:

### ❌ **Before (Broken)**
- 10+ hardcoded `localhost:4000` URLs
- No environment configuration
- Single-machine development only

### ✅ **After (Production Ready)**  
- ✅ Centralized configuration (`dashboard/src/lib/config.ts`)
- ✅ Environment-specific builds
- ✅ Automated deployment script
- ✅ Multi-environment support

---

## 🏗️ **Environment Configuration**

### **Development (.env)**
```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_API_HOST=localhost
VITE_API_PORT=4000
```

### **u0 Deployment (.env.u0)**
```env
VITE_API_BASE_URL=http://100.76.195.14:4000/api
VITE_API_HOST=100.76.195.14
VITE_API_PORT=4000
```

### **Production (.env.production)**
```env
VITE_API_BASE_URL=http://100.76.195.14:4000/api
VITE_API_HOST=100.76.195.14
VITE_API_PORT=4000
```

---

## 📦 **Build Commands**

```bash
# Development build
npm run build

# Production build  
npm run build:production

# u0 deployment build
npm run build:u0
```

---

## 🚀 **One-Command Deployment**

### **Deploy to u0**
```bash
./dashboard/deploy.sh u0 100.76.195.14
```

### **Deploy to Custom Host**
```bash
./dashboard/deploy.sh production your.server.ip
```

---

## 🔧 **Manual Deployment Steps**

If you prefer manual deployment:

### **1. Build for u0**
```bash
cd dashboard
npm run build:u0
```

### **2. Copy to u0**
```bash
scp -r dist/* i4ops@100.76.195.14:/home/i4ops/i4ops-dashboard/
```

### **3. Serve on u0**
```bash
ssh i4ops@100.76.195.14
cd /home/i4ops/i4ops-dashboard
python3 -m http.server 8888
```

---

## 🌐 **Network Access Configuration**

### **Backend CORS Update**
Your server needs to allow connections from u0:

```typescript
// server/src/app.ts
app.use(cors({ 
  origin: [
    'http://localhost:8888',
    'http://100.76.195.14:8888',  // Add this
    'http://192.168.1.0/24'       // Local network access
  ] 
}));
```

### **Firewall Rules**
```bash
# On u0, allow incoming connections on port 8888
sudo ufw allow 8888/tcp
```

---

## 🔍 **Troubleshooting**

### **API Connection Failed**
```bash
# 1. Check backend is running on u0:4000
curl http://100.76.195.14:4000/api/health

# 2. Check frontend environment
cd dashboard && cat .env.u0

# 3. Verify browser console for CORS errors
```

### **Dashboard Won't Load**
```bash
# 1. Check web server is running on u0:8888
curl http://100.76.195.14:8888

# 2. Verify file permissions
ls -la /home/i4ops/i4ops-dashboard/

# 3. Check for build errors
npm run build:u0 --verbose
```

### **Real-time Updates Broken**
```bash
# 1. Check SSE endpoint
curl http://100.76.195.14:4000/api/events

# 2. Check browser network tab for SSE connection
# 3. Verify CORS allows SSE connections
```

---

## 🏭 **Production Considerations**

### **Use Nginx/Apache** (Recommended)
Instead of Python's simple HTTP server:

```nginx
# /etc/nginx/sites-available/i4ops-dashboard
server {
    listen 8888;
    server_name 100.76.195.14;
    
    root /home/i4ops/i4ops-dashboard/current;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Process Management**
Use PM2 or systemd to manage both frontend and backend:

```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start server/src/index.ts --name "i4ops-backend"

# Serve frontend with PM2
pm2 serve /home/i4ops/i4ops-dashboard/current 8888 --name "i4ops-frontend"

# Save PM2 config
pm2 startup
pm2 save
```

---

## 🎯 **Next Steps**

1. **Test Current Setup**:
   ```bash
   cd dashboard && npm run dev
   # Verify config debug logs in browser console
   ```

2. **Deploy to u0**:
   ```bash
   ./dashboard/deploy.sh u0
   ```

3. **Verify Deployment**:
   - Open http://100.76.195.14:8888
   - Check Developer Console for API calls
   - Test real-time updates

4. **Setup Production Web Server** (nginx/apache)

5. **Implement RBAC** (now that deployment is fixed!)

---

## 🚨 **Before RBAC Implementation**

Now that deployment is sorted, we can **properly implement RBAC** with:
- Backend authentication middleware  
- Role-based API protection
- Frontend permission gates
- Audit logging

The **foundation is now solid** for production-ready authentication! 🎉 