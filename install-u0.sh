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

# Setup database
echo -e "${BLUE}Setting up database...${NC}"
if [ "$DB_TYPE" = "postgresql" ]; then
    print_status "Using existing PostgreSQL database"
    
    # Test connection first
    if npx prisma db pull --force > /dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_warning "Database connection failed, attempting to create/setup..."
        # Try to ensure database exists
        sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='i4ops_dashboard';" | grep -q 1 || \
        sudo -u postgres createdb i4ops_dashboard 2>/dev/null || true
        
        # Ensure user has access
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE i4ops_dashboard TO i4ops;" 2>/dev/null || true
    fi
    
    # Clean and regenerate Prisma client to fix TypeScript errors
    print_status "Updating database enum values"
    rm -rf node_modules/.prisma/client 2>/dev/null || true
    
    # Apply enum updates to database
    PGPASSWORD=i4ops123 psql -h localhost -U i4ops -d i4ops_dashboard -f update-enums.sql 2>/dev/null || true
    
    # Force schema sync and regenerate client
    npx prisma db push --accept-data-loss
    npx prisma generate
else
    # SQLite setup (if PostgreSQL not available)
    print_warning "Setting up SQLite database"
    rm -rf node_modules/.prisma/client 2>/dev/null || true
    npx prisma db push --accept-data-loss
    npx prisma generate
fi
print_status "Database setup complete"

# Build server
echo -e "${BLUE}Building server...${NC}"
npm run build

# Create local telemetry service (modified for local file access)
echo -e "${BLUE}Creating local telemetry service...${NC}"
cat > src/infrastructure/local-telemetry-service.ts << 'EOF'
import { promises as fs } from 'fs';
import { z } from 'zod';
import { Logger } from './logger';

const TelemetrySchema = z.object({
  hostname: z.string(),
  vmname: z.string(),
  machineId: z.string(),
  ip: z.string().ip(),
  os: z.string(),
  cpu: z.object({
    usage_percent: z.number(),
    count: z.number().optional(),
    frequency_mhz: z.number().optional()
  }),
  memory: z.object({
    usage_percent: z.number(),
    total_gb: z.number().optional(),
    available_gb: z.number().optional(),
    used_gb: z.number().optional()
  }),
  disk: z.object({
    usage_percent: z.number(),
    total_gb: z.number().optional(),
    free_gb: z.number().optional(),
    used_gb: z.number().optional()
  }),
  system: z.object({
    uptime_seconds: z.number(),
    boot_time: z.string().optional(),
    load_average: z.array(z.number()).optional(),
    process_count: z.number().optional()
  }),
  timestamp: z.number()
});

export type TelemetryData = {
  hostname: string;
  vmname: string;
  machineId: string;
  ip: string;
  os: string;
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
  timestamp: number;
};

export class LocalTelemetryService {
  private logger: Logger;
  private telemetryDir = '/mnt/vm-telemetry-json';

  constructor() {
    this.logger = new Logger('LocalTelemetryService');
  }

  async getAllTelemetryData(): Promise<TelemetryData[]> {
    try {
      const files = await fs.readdir(this.telemetryDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const validData: TelemetryData[] = [];
      const staleThresholdMs = 10 * 60 * 1000; // 10 minutes

      for (const file of jsonFiles) {
        try {
          const filePath = `${this.telemetryDir}/${file}`;
          const stats = await fs.stat(filePath);
          const now = Date.now();
          
          // Check if file is too old
          if (now - stats.mtime.getTime() > staleThresholdMs) {
            continue;
          }

          const content = await fs.readFile(filePath, 'utf8');
          const item = JSON.parse(content);
          
          const result = TelemetrySchema.safeParse(item);
          if (result.success) {
            const jsonTimestampMs = result.data.timestamp * 1000;
            if (now - jsonTimestampMs > staleThresholdMs) {
              continue;
            }

            const transformedData: TelemetryData = {
              hostname: result.data.hostname,
              vmname: result.data.vmname,
              machineId: result.data.machineId,
              ip: result.data.ip,
              os: result.data.os,
              cpu: result.data.cpu.usage_percent,
              ram: result.data.memory.usage_percent,
              disk: result.data.disk.usage_percent,
              uptime: result.data.system.uptime_seconds,
              timestamp: result.data.timestamp
            };
            validData.push(transformedData);
          }
        } catch (error) {
          this.logger.warn(`Failed to read file ${file}`, error);
        }
      }

      this.logger.info(`Processed ${jsonFiles.length} files, ${validData.length} valid`);
      return validData;
    } catch (error) {
      this.logger.error('Failed to read telemetry directory', error);
      return [];
    }
  }
}
EOF

# Update vm-sync-service to use local telemetry
sed -i "s/TelemetryService/LocalTelemetryService/g" src/services/vm-sync-service.ts
sed -i "s|'../infrastructure/telemetry-service'|'../infrastructure/local-telemetry-service'|g" src/services/vm-sync-service.ts

# Rebuild after changes
npm run build

# Go back to root
cd ..

# Setup frontend
echo -e "${BLUE}Setting up frontend...${NC}"
cd dashboard

# Install frontend dependencies
npm install

# Create production environment for u0
cat > .env.u0 << EOF
VITE_SUPABASE_URL=https://emzmgfesjqlmikvtseqa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtem1nZmVzanFsbWlrdnRzZXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MjM3NDEsImV4cCI6MjA2NDM5OTc0MX0.khn-4iBTbzVdIz13fzFZ4JTtWbopkbSoV2_y-V6KgAY
VITE_API_BASE_URL=http://localhost:$BACKEND_PORT/api
VITE_API_HOST=localhost
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

# Configure nginx for frontend
echo -e "${BLUE}Configuring nginx...${NC}"
sudo tee /etc/nginx/sites-available/i4ops-dashboard << EOF
server {
    listen $FRONTEND_PORT;
    server_name _;
    root $APP_DIR/dashboard/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/i4ops-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

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
        ;;
    logs)
        pm2 logs
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
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac
EOF

chmod +x manage.sh

# Final status check
echo -e "${BLUE}Final status check...${NC}"
sleep 5
pm2 status

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
echo "  ./manage.sh start     - Start all services"
echo "  ./manage.sh stop      - Stop all services"
echo "  ./manage.sh restart   - Restart all services"
echo "  ./manage.sh status    - Check service status"
echo "  ./manage.sh logs      - View application logs"
echo "  ./manage.sh update    - Update from git and restart"
echo ""
echo -e "${GREEN}Services are now running persistently and will survive SSH disconnection!${NC}" 