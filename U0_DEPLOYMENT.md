# i4ops Dashboard Deployment on u0

## Quick Installation

This script installs the complete i4ops dashboard directly on u0 (100.76.195.14) with persistent services.

### Prerequisites

1. SSH access to u0 as the `i4ops` user
2. Sudo privileges for the `i4ops` user
3. Git repository available on u0

### Installation Steps

1. **Copy the code to u0:**
   ```bash
   # From your local machine
   scp -r . i4ops@100.76.195.14:/home/i4ops/i4ops-dashboard/
   ```

2. **SSH into u0:**
   ```bash
   ssh i4ops@100.76.195.14
   ```

3. **Run the installation script:**
   ```bash
   cd /home/i4ops/i4ops-dashboard
   ./install-u0.sh
   ```

4. **Update Tailscale credentials:**
   ```bash
   nano server/.env
   # Update TS_OAUTH_CLIENT_ID, TS_OAUTH_CLIENT_SECRET, and TAILNET
   ```

5. **Restart services:**
   ```bash
   ./manage.sh restart
   ```

### Access

- **Dashboard:** http://100.76.195.14:8888
- **API:** http://100.76.195.14:4000

### Management Commands

```bash
./manage.sh start     # Start all services
./manage.sh stop      # Stop all services  
./manage.sh restart   # Restart all services
./manage.sh status    # Check service status
./manage.sh logs      # View application logs
./manage.sh update    # Update from git and restart
```

### Key Changes for u0 Deployment

1. **Local Telemetry:** Modified to read `/mnt/vm-telemetry-json/*.json` files locally instead of over SSH
2. **Persistent Services:** Uses PM2 to keep backend running even after SSH disconnection
3. **Nginx Proxy:** Serves frontend and proxies API requests to backend
4. **SQLite Database:** Self-contained database file for simplicity

### Troubleshooting

1. **Check service status:**
   ```bash
   ./manage.sh status
   ```

2. **View logs:**
   ```bash
   ./manage.sh logs
   # Or specific logs:
   pm2 logs i4ops-backend
   sudo journalctl -u nginx -f
   ```

3. **Restart everything:**
   ```bash
   ./manage.sh restart
   ```

4. **Check disk space:**
   ```bash
   df -h
   ```

5. **Check if ports are open:**
   ```bash
   sudo netstat -tlnp | grep -E ':4000|:8888'
   ```

### What the Script Does

1. **System Setup:**
   - Installs Node.js 18, PM2, and nginx
   - Creates application directory structure

2. **Backend Setup:**
   - Installs dependencies and builds the server
   - Creates local telemetry service (no SSH needed)
   - Sets up SQLite database with Prisma
   - Configures environment variables

3. **Frontend Setup:**
   - Builds React app for u0 environment
   - Configures nginx to serve static files and proxy API

4. **Service Management:**
   - Configures PM2 for persistent backend process
   - Sets up nginx for frontend serving
   - Creates management scripts for easy operation

### No Impact on Existing Telemetry

The dashboard running on u0 will **not** affect the existing telemetry collection since:
- It reads the same `/mnt/vm-telemetry-json/` files locally
- No changes to how telemetry is written to those files
- Same data processing, just direct file access instead of SSH

The telemetry collection from other hosts continues unchanged via SSH. 