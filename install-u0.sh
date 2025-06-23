#!/bin/bash

# =============================================================================
# i4ops Dashboard Installation Script for u0
# =============================================================================
# This script installs the complete i4ops dashboard on u0 (100.76.195.14)
# Usage: ./install-u0.sh
# 
# What it does:
# - Installs Node.js, npm, PM2
# - Detects and configures database (PostgreSQL preferred, SQLite fallback)
# - Configures environment variables
# - Builds and deploys frontend + backend
# - Sets up persistent services with PM2
# - Configures nginx for frontend serving
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/i4ops/i4ops-dashboard"
DB_PATH="$APP_DIR/server/database.db"
FRONTEND_PORT=8888
BACKEND_PORT=4000
USER="i4ops"

echo -e "${BLUE}Starting i4ops Dashboard Installation on u0${NC}"
echo "============================================================"

# Function to print status
print_status() {
    echo -e "${GREEN}[OK] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check if running as correct user
if [ "$USER" != "i4ops" ]; then
    print_error "Please run this script as the i4ops user"
    print_warning "Switch to i4ops user: sudo su - i4ops"
    exit 1
fi

# Create app directory
echo -e "${BLUE}Setting up directories...${NC}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Install Node.js 18 if not present
echo -e "${BLUE}Installing Node.js...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
print_status "Node.js $(node -v) installed"

# Install PM2 globally for process management
echo -e "${BLUE}Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    pm2 startup systemd -u $USER --hp /home/$USER
fi
print_status "PM2 installed"

# Install nginx if not present
echo -e "${BLUE}Installing nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
fi
print_status "Nginx installed"

# Clone or update repository
echo -e "${BLUE}Getting latest code...${NC}"
if [ -d ".git" ]; then
    git pull
else
    # If running from existing code, this step might be skipped
    print_warning "Assuming code is already present in $APP_DIR"
fi

# Detect and configure database
echo -e "${BLUE}Detecting database setup...${NC}"
if systemctl is-active --quiet postgresql; then
    print_status "PostgreSQL detected and running"
    DB_TYPE="postgresql"
    # Set up database authentication for Prisma
    print_status "Configuring database authentication"
    
    # Set a password for i4ops user for Prisma compatibility
    sudo -u postgres psql -c "ALTER USER i4ops PASSWORD 'i4ops123';" 2>/dev/null || true
    
    # Ensure proper database permissions
    sudo -u postgres psql -d i4ops_dashboard -c "GRANT ALL ON SCHEMA public TO i4ops;" 2>/dev/null || true
    sudo -u postgres psql -d i4ops_dashboard -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO i4ops;" 2>/dev/null || true
    sudo -u postgres psql -d i4ops_dashboard -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO i4ops;" 2>/dev/null || true
    sudo -u postgres psql -d i4ops_dashboard -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO i4ops;" 2>/dev/null || true
    
    # Use password authentication for Prisma
    DATABASE_URL="postgresql://i4ops:i4ops123@localhost:5432/i4ops_dashboard"
    
    # Test the connection format Prisma will use
    if PGPASSWORD=i4ops123 psql -h localhost -U i4ops -d i4ops_dashboard -c "SELECT 1;" > /dev/null 2>&1; then
        print_status "Database connection configured successfully"
    else
        print_error "Database connection test failed"
        exit 1
    fi
else
    print_warning "PostgreSQL not detected, using SQLite"
    DB_TYPE="sqlite"
    DATABASE_URL="file:$DB_PATH"
fi

# Create environment file for server
echo -e "${BLUE}Configuring environment...${NC}"
cat > server/.env << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
DATABASE_URL=$DATABASE_URL

# SSH credentials (not needed for local telemetry, but kept for compatibility)
SSH_USER=i4ops
SSH_PASSWORD=placeholder
U0_IP=localhost

# Tailscale OAuth (you'll need to set these)
TS_OAUTH_CLIENT_ID=your_client_id_here
TS_OAUTH_CLIENT_SECRET=your_client_secret_here
TAILNET=your_tailnet_here
EOF

print_warning "You need to update Tailscale OAuth credentials in server/.env"

# Install server dependencies
echo -e "${BLUE}Installing server dependencies...${NC}"
cd server
npm install

# Setup database - SAFE VERSION (no data loss)
echo -e "${BLUE}Setting up database safely...${NC}"
if [ "$DB_TYPE" = "postgresql" ]; then
    print_status "Using existing PostgreSQL database"
    
    # Test connection first
    if PGPASSWORD=i4ops123 psql -h localhost -U i4ops -d i4ops_dashboard -c "SELECT 1;" > /dev/null 2>&1; then
        print_status "Database connection successful"
        
        # Check if we need to run migrations safely
        if npx prisma migrate status 2>/dev/null; then
            print_status "Database schema is up to date"
        else
            print_warning "Running safe database migrations..."
            # Only deploy migrations, don't reset schema
            npx prisma migrate deploy 2>/dev/null || true
        fi
    else
        print_warning "Database connection failed, attempting to create/setup..."
        # Try to ensure database exists
        sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='i4ops_dashboard';" | grep -q 1 || \
        sudo -u postgres createdb i4ops_dashboard 2>/dev/null || true
        
        # Ensure user has access
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE i4ops_dashboard TO i4ops;" 2>/dev/null || true
        
        # Deploy schema if database is new
        npx prisma migrate deploy
    fi
    
    # Clean and regenerate Prisma client for TypeScript compatibility
    print_status "Regenerating Prisma client"
    rm -rf node_modules/.prisma/client 2>/dev/null || true
    npx prisma generate
else
    # SQLite setup (if PostgreSQL not available)
    print_warning "Setting up SQLite database"
    rm -rf node_modules/.prisma/client 2>/dev/null || true
    npx prisma migrate deploy
    npx prisma generate
fi
print_status "Database setup complete (no data lost)"

# Build server
echo -e "${BLUE}Building server...${NC}"
npm run build

# Go back to root
cd ..

# Setup frontend
echo -e "${BLUE}Setting up frontend...${NC}"
cd dashboard

# Install frontend dependencies
npm install

# Create production environment for u0 - FIXED API URLs
cat > .env.u0 << EOF
VITE_SUPABASE_URL=https://emzmgfesjqlmikvtseqa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtem1nZmVzanFsbWlrdnRzZXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MjM3NDEsImV4cCI6MjA2NDM5OTc0MX0.khn-4iBTbzVdIz13fzFZ4JTtWbopkbSoV2_y-V6KgAY
VITE_API_BASE_URL=http://100.76.195.14:$BACKEND_PORT/api
VITE_API_HOST=100.76.195.14
VITE_API_PORT=$BACKEND_PORT
EOF

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
npm run build:u0

# Go back to root
cd ..

# Create PM2 ecosystem file
echo -e "${BLUE}Creating PM2 configuration...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'i4ops-backend',
    cwd: './server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Configure nginx for frontend - FIXED CONFIGURATION
echo -e "${BLUE}Configuring nginx...${NC}"
sudo tee /etc/nginx/sites-available/i4ops-dashboard << EOF
server {
    listen $FRONTEND_PORT;
    server_name _;
    root $APP_DIR/dashboard/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/javascript 
        application/xml+rss 
        application/json
        application/manifest+json;

    # Handle client-side routing (React Router)
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache control for HTML files
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle manifest.json and other JSON files
    location ~* \.json$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
}
EOF

# Remove default nginx site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable the site
sudo ln -sf /etc/nginx/sites-available/i4ops-dashboard /etc/nginx/sites-enabled/

# Test nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration test passed"
    sudo systemctl reload nginx
    sudo systemctl enable nginx
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Start services with PM2
echo -e "${BLUE}Starting services...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Backend started on port $BACKEND_PORT"
print_status "Frontend available on port $FRONTEND_PORT"

# Create management script
echo -e "${BLUE}Creating management commands...${NC}"
cat > manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    start)
        pm2 start ecosystem.config.js
        sudo systemctl start nginx
        echo "Services started"
        ;;
    stop)
        pm2 stop all
        sudo systemctl stop nginx
        echo "Services stopped"
        ;;
    restart)
        pm2 restart all
        sudo systemctl reload nginx
        echo "Services restarted"
        ;;
    status)
        echo "PM2 Status:"
        pm2 status
        echo ""
        echo "Nginx Status:"
        sudo systemctl status nginx --no-pager -l
        echo ""
        echo "Frontend Test:"
        curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/ && echo " - Frontend responding" || echo " - Frontend not responding"
        echo "Backend Test:"
        curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/ && echo " - Backend responding" || echo " - Backend not responding"
        ;;
    logs)
        pm2 logs
        ;;
    nginx-logs)
        sudo tail -f /var/log/nginx/error.log
        ;;
    update)
        echo "Updating application..."
        pm2 stop all
        git pull
        cd server && npm install && npm run build && cd ..
        cd dashboard && npm install && npm run build:u0 && cd ..
        pm2 start ecosystem.config.js
        sudo systemctl reload nginx
        echo "Update complete"
        ;;
    fix-frontend)
        echo "Rebuilding frontend..."
        cd dashboard
        npm run build:u0
        cd ..
        sudo systemctl reload nginx
        echo "Frontend rebuilt and nginx reloaded"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|nginx-logs|update|fix-frontend}"
        exit 1
        ;;
esac
EOF

chmod +x manage.sh

# Final status check
echo -e "${BLUE}Final status check...${NC}"
sleep 5
pm2 status

# Test both services
echo -e "${BLUE}Testing services...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/ | grep -q "200"; then
    print_status "Backend is responding on port $BACKEND_PORT"
else
    print_warning "Backend may not be responding correctly"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT/ | grep -q "200"; then
    print_status "Frontend is responding on port $FRONTEND_PORT"
else
    print_warning "Frontend may not be responding correctly"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}Installation Complete!${NC}"
echo "============================================================"
echo -e "${BLUE}Dashboard URL:${NC} http://100.76.195.14:$FRONTEND_PORT"
echo -e "${BLUE}API URL:${NC} http://100.76.195.14:$BACKEND_PORT"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update Tailscale OAuth credentials in server/.env"
echo "2. Access dashboard at: http://100.76.195.14:$FRONTEND_PORT"
echo "3. Use ./manage.sh for service management"
echo ""
echo -e "${YELLOW}Management Commands:${NC}"
echo "  ./manage.sh start         - Start all services"
echo "  ./manage.sh stop          - Stop all services"
echo "  ./manage.sh restart       - Restart all services"
echo "  ./manage.sh status        - Check service status (with tests)"
echo "  ./manage.sh logs          - View application logs"
echo "  ./manage.sh nginx-logs    - View nginx error logs"
echo "  ./manage.sh update        - Update from git and restart"
echo "  ./manage.sh fix-frontend  - Rebuild frontend only"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "- If frontend doesn't load: ./manage.sh fix-frontend"
echo "- Check logs: ./manage.sh logs"
echo "- Check nginx: ./manage.sh nginx-logs"
echo "- Full status: ./manage.sh status"
echo ""
echo -e "${GREEN}Services are now running persistently and will survive SSH disconnection!${NC}" 