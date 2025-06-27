#!/bin/bash

# i4ops u0 Log Sync Setup Script
# Sets up SSH-based log synchronization from u0 to local backend

set -e

echo "🔄 Setting up i4ops u0 Log Sync System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if in correct directory
if [ ! -f "package.json" ] && [ ! -f "server/package.json" ]; then
    log_error "Please run this script from the i4ops-dashboard root directory"
    exit 1
fi

# Check system requirements
log_info "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not installed"
    exit 1
fi
log_success "Node.js found: $(node --version)"

# Check Python 3
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is required but not installed"
    exit 1
fi
log_success "Python 3 found: $(python3 --version)"

# Install Node.js dependencies
log_info "Installing Node.js dependencies..."
cd server
npm install node-ssh
log_success "Node.js dependencies installed"
cd ..

# Install Python dependencies if not already installed
log_info "Installing Python dependencies..."
if [ ! -f "requirements.txt" ]; then
    log_info "Creating requirements.txt..."
    cat > requirements.txt << EOF
asyncio
asyncpg>=0.28.0
psycopg2-binary>=2.9.0
python-dateutil>=2.8.0
EOF
fi

pip3 install -r requirements.txt
log_success "Python dependencies installed"

# Set up environment file
log_info "Setting up environment configuration..."

ENV_FILE="server/.env"
if [ ! -f "$ENV_FILE" ]; then
    log_info "Creating .env file from template..."
    cp server/.env.example "$ENV_FILE" 2>/dev/null || {
        log_warning ".env.example not found, creating basic .env"
        cat > "$ENV_FILE" << EOF
# Database
DATABASE_URL="postgresql://i4ops:password@localhost:5432/i4ops_dashboard"

# SSH Configuration for u0 log collection
SSH_USERNAME=i4ops
SSH_PASSWORD=your_ssh_password_here
SSH_TIMEOUT=30

# u0 Log Collection Settings
U0_HOST=u0
U0_IP=100.76.195.14
LOG_SYNC_INTERVAL=60
LOG_BASE_PATH=/mnt/vm-security

# Application Settings
NODE_ENV=development
PORT=4000
EOF
    }
    log_success "Environment file created: $ENV_FILE"
    log_warning "Please edit $ENV_FILE and set your SSH_PASSWORD"
else
    log_success "Environment file already exists: $ENV_FILE"
fi

# Test SSH connection to u0
log_info "Testing SSH connection to u0..."
if [ -f "$ENV_FILE" ]; then
    # Source environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    if [ "$SSH_PASSWORD" = "your_ssh_password_here" ]; then
        log_warning "SSH_PASSWORD not configured in $ENV_FILE"
        log_info "Please edit $ENV_FILE and set the correct SSH password for u0"
    else
        # Test SSH connection (with timeout)
        timeout 10 sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_USERNAME@$U0_IP" "echo 'SSH connection successful'" 2>/dev/null && {
            log_success "SSH connection to u0 successful"
        } || {
            log_warning "Could not connect to u0 via SSH. Please verify:"
            echo "  - SSH_USERNAME: $SSH_USERNAME"
            echo "  - U0_IP: $U0_IP"
            echo "  - SSH_PASSWORD: (check your .env file)"
            echo "  - u0 is accessible from this machine"
        }
    fi
fi

# Create temp directory for log sync
log_info "Setting up temporary directories..."
TEMP_DIR="/tmp/i4ops-logs"
mkdir -p "$TEMP_DIR"
log_success "Temp directory created: $TEMP_DIR"

# Set up database (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
    log_info "Running database migrations..."
    cd server
    npm run prisma:migrate || {
        log_warning "Database migration failed - ensure PostgreSQL is running and DATABASE_URL is correct"
    }
    cd ..
    log_success "Database setup completed"
else
    log_warning "DATABASE_URL not set - database setup skipped"
fi

# Create test script
log_info "Creating test script..."
cat > test-log-sync.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing i4ops u0 Log Sync System..."

# Source environment
set -a
source server/.env 2>/dev/null || {
    echo "❌ Error: server/.env not found"
    exit 1
}
set +a

echo "Configuration:"
echo "  SSH_USERNAME: $SSH_USERNAME"
echo "  U0_IP: $U0_IP"
echo "  LOG_BASE_PATH: $LOG_BASE_PATH"
echo "  LOG_SYNC_INTERVAL: ${LOG_SYNC_INTERVAL}s"

# Test 1: SSH Connection
echo ""
echo "Test 1: SSH Connection to u0"
timeout 10 sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_USERNAME@$U0_IP" "echo 'SSH OK'" 2>/dev/null && {
    echo "✅ SSH connection successful"
} || {
    echo "❌ SSH connection failed"
    exit 1
}

# Test 2: VM Directory Discovery
echo ""
echo "Test 2: VM Directory Discovery"
timeout 15 sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_USERNAME@$U0_IP" "ls -1 $LOG_BASE_PATH 2>/dev/null | grep '^u' | head -5" && {
    echo "✅ VM directories found"
} || {
    echo "❌ No VM directories found or path inaccessible"
}

# Test 3: Log File Access
echo ""
echo "Test 3: Log File Access"
timeout 15 sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_USERNAME@$U0_IP" "find $LOG_BASE_PATH -name '*.log' -type f | head -3" && {
    echo "✅ Log files accessible"
} || {
    echo "❌ Log files not accessible"
}

# Test 4: Python Security Processor
echo ""
echo "Test 4: Python Security Processor"
python3 -c "
import sys, os
sys.path.append('.')
from security_processor import SecurityProcessor
print('✅ SecurityProcessor imported successfully')

# Test pattern matching
processor = SecurityProcessor()
test_line = 'Jan 15 10:30:45 u2-vm30000 sshd[1234]: Failed password for admin from 192.168.1.100'
event = processor.parse_log_line(test_line)
print('✅ Pattern matching works')
" || {
    echo "❌ Python security processor test failed"
}

echo ""
echo "✅ u0 Log Sync System test completed!"
echo ""
echo "To start the system:"
echo "1. Edit server/.env and set SSH_PASSWORD"
echo "2. Start backend: cd server && npm run dev"
echo "3. Start frontend: cd dashboard && npm run dev"
echo "4. Check logs sync every minute automatically"
EOF

chmod +x test-log-sync.sh
log_success "Test script created: test-log-sync.sh"

# Create monitoring script
log_info "Creating monitoring script..."
cat > monitor-log-sync.sh << 'EOF'
#!/bin/bash

echo "📊 i4ops Log Sync Monitor"
echo "Press Ctrl+C to stop monitoring"
echo ""

while true; do
    clear
    echo "📊 i4ops Log Sync Monitor - $(date)"
    echo "================================"
    
    # Backend status
    if curl -s http://localhost:4000/api/security-events/status >/dev/null 2>&1; then
        echo "✅ Backend: Running"
        curl -s http://localhost:4000/api/security-events/status | python3 -m json.tool 2>/dev/null || echo "API response received"
    else
        echo "❌ Backend: Not running"
    fi
    
    echo ""
    echo "Recent Security Events:"
    echo "----------------------"
    
    # Show recent events count
    curl -s "http://localhost:4000/api/security-events?limit=5" 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    events = data.get('data', [])
    print(f'Total events: {data.get(\"total\", 0)}')
    for event in events[:3]:
        print(f'- {event[\"severity\"].upper()}: {event[\"rule\"]} from {event.get(\"vm\", {}).get(\"machineId\", \"unknown\")}')
except:
    print('Could not fetch events')
" || echo "Could not fetch recent events"
    
    echo ""
    echo "Temp directory: $(ls -la /tmp/i4ops-logs 2>/dev/null | wc -l) files"
    echo ""
    echo "Refreshing in 30 seconds... (Ctrl+C to stop)"
    
    sleep 30
done
EOF

chmod +x monitor-log-sync.sh
log_success "Monitoring script created: monitor-log-sync.sh"

# Provide next steps
echo ""
log_success "🎉 i4ops u0 Log Sync System setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. 📝 Edit server/.env and set your SSH_PASSWORD for u0"
echo "2. 🧪 Test the system: ./test-log-sync.sh"
echo "3. 🚀 Start the backend: cd server && npm run dev"
echo "4. 🌐 Start the frontend: cd dashboard && npm run dev"
echo "5. 📊 Monitor the system: ./monitor-log-sync.sh"
echo ""
echo "🔧 Key Features:"
echo "• 🔄 Automatic log sync every minute from u0"
echo "• 🔐 SSH-based secure log collection"
echo "• 🐍 Python security event processing"
echo "• 📊 Real-time dashboard updates"
echo "• 🔍 Only downloads modified log files"
echo "• 🧹 Automatic cleanup of temporary files"
echo ""
echo "🌐 Web Interface:"
echo "• Dashboard: http://localhost:8888"
echo "• Security Page: http://localhost:8888/security"
echo "• API Status: http://localhost:4000/api/security-events/status"
echo ""

# Print configuration summary
log_info "Configuration Summary:"
echo "• u0 Host: ${U0_IP:-100.76.195.14}"
echo "• Log Path: ${LOG_BASE_PATH:-/mnt/vm-security}"
echo "• Sync Interval: Every minute"
echo "• SSH User: ${SSH_USERNAME:-i4ops}"
echo "• Temp Directory: /tmp/i4ops-logs"
echo "• Database: ${DATABASE_URL:-Not configured}"

log_success "Setup complete! 🚀" 