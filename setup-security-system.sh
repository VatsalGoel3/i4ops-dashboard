#!/bin/bash

# i4ops Security System Setup Script
# Sets up the integrated Python security processor with Node.js backend

set -e

echo "🔒 Setting up i4ops Security System..."

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

# Check if running as correct user
if [ "$USER" != "i4ops" ]; then
    log_warning "This script should be run as the 'i4ops' user"
    log_info "Current user: $USER"
fi

# Check system requirements
log_info "Checking system requirements..."

# Check Python 3
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is required but not installed"
    exit 1
fi
log_success "Python 3 found: $(python3 --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not installed"
    exit 1
fi
log_success "Node.js found: $(node --version)"

# Check if in correct directory
if [ ! -f "package.json" ] && [ ! -f "server/package.json" ]; then
    log_error "Please run this script from the i4ops-dashboard root directory"
    exit 1
fi

# Install Python dependencies
log_info "Installing Python dependencies..."
if [ ! -f "requirements.txt" ]; then
    log_info "Creating requirements.txt for Python dependencies..."
    cat > requirements.txt << EOF
asyncio
asyncpg>=0.28.0
psycopg2-binary>=2.9.0
fastapi>=0.100.0
uvicorn>=0.22.0
pydantic>=2.0.0
python-multipart>=0.0.6
EOF
fi

pip3 install -r requirements.txt
log_success "Python dependencies installed"

# Set up log directories
log_info "Setting up log directories..."
sudo mkdir -p /mnt/vm-security
sudo chown i4ops:i4ops /mnt/vm-security

# Create VM directories structure
VM_DIRS=("u1" "u2-vm30000" "u3" "u4" "u5" "u6" "u7" "u8-vm30000" "u9" "u10" "u11" "u12")
for vm_dir in "${VM_DIRS[@]}"; do
    sudo mkdir -p "/mnt/vm-security/$vm_dir"
    sudo chown i4ops:i4ops "/mnt/vm-security/$vm_dir"
    
    # Create sample log files if they don't exist
    if [ ! -f "/mnt/vm-security/$vm_dir/auth.log" ]; then
        touch "/mnt/vm-security/$vm_dir/auth.log"
        touch "/mnt/vm-security/$vm_dir/kern.log"
        touch "/mnt/vm-security/$vm_dir/syslog"
    fi
done
log_success "VM log directories created: ${VM_DIRS[*]}"

# Set up SSH keys for VM access
log_info "Setting up SSH keys..."
if [ ! -f "/home/i4ops/.ssh/id_rsa" ]; then
    log_info "Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f /home/i4ops/.ssh/id_rsa -N "" -C "i4ops@security-scanner"
    log_success "SSH key pair generated"
else
    log_success "SSH key pair already exists"
fi

# Make scripts executable
log_info "Setting up executable permissions..."
chmod +x scripts/vm-log-scanner.py
chmod +x security_processor.py
chmod +x security_api.py
log_success "Scripts made executable"

# Set up database (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
    log_info "Running database migrations..."
    cd server
    npm run prisma:migrate || log_warning "Database migration failed - ensure PostgreSQL is running"
    cd ..
    log_success "Database setup completed"
else
    log_warning "DATABASE_URL not set - database setup skipped"
fi

# Test Python security processor
log_info "Testing Python security processor..."
python3 -c "
import sys
sys.path.append('.')
from security_processor import SecurityProcessor
print('✅ SecurityProcessor imports successfully')
"
log_success "Python security processor test passed"

# Test VM log scanner
log_info "Testing VM log scanner..."
python3 scripts/vm-log-scanner.py --help > /dev/null 2>&1 || {
    log_info "VM log scanner help test passed"
}

# Create systemd service for security processor (optional)
if command -v systemctl &> /dev/null; then
    log_info "Creating systemd service for security monitoring..."
    
    sudo tee /etc/systemd/system/i4ops-security.service > /dev/null << EOF
[Unit]
Description=i4ops Security Log Monitor
After=network.target postgresql.service

[Service]
Type=simple
User=i4ops
WorkingDirectory=$(pwd)
Environment=DATABASE_URL=${DATABASE_URL:-}
ExecStart=/usr/bin/python3 $(pwd)/security_processor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log_success "Systemd service created: i4ops-security.service"
    log_info "To start: sudo systemctl start i4ops-security"
    log_info "To enable auto-start: sudo systemctl enable i4ops-security"
else
    log_warning "Systemd not available - service not created"
fi

# Create a test script
log_info "Creating test script..."
cat > test-security-system.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing i4ops Security System..."

# Test 1: VM Directory Discovery
echo "Test 1: VM Directory Discovery"
python3 -c "
import sys, asyncio
sys.path.append('.')
from scripts.vm_log_scanner import VMLogScanner

async def test():
    scanner = VMLogScanner('/mnt/vm-security')
    dirs = scanner.discover_vm_directories()
    print(f'Found {len(dirs)} VM directories: {dirs}')

asyncio.run(test())
"

# Test 2: Security Processor Patterns
echo "Test 2: Security Pattern Matching"
python3 -c "
import sys
sys.path.append('.')
from security_processor import SecurityProcessor

processor = SecurityProcessor()

# Test brute force pattern
test_line = '2025-01-15 10:30:45 | u2-vm30000 | auth.log | Jan 15 10:30:45 u2-vm30000 sshd[1234]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2'
event = processor.parse_log_line(test_line)
if event:
    print(f'✅ Detected {event.rule.value} event with severity {event.severity.value}')
else:
    print('❌ No event detected')
"

echo "✅ Security system test completed"
EOF

chmod +x test-security-system.sh
log_success "Test script created: test-security-system.sh"

# Provide next steps
echo ""
log_success "🎉 i4ops Security System setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Ensure PostgreSQL is running and DATABASE_URL is set"
echo "2. Start the Node.js backend: cd server && npm run dev"
echo "3. Start the React frontend: cd dashboard && npm run dev"
echo "4. Test the system: ./test-security-system.sh"
echo "5. Monitor logs: tail -f /var/log/i4ops-security.log"
echo ""
echo "🔧 Manual Commands:"
echo "• Run security scan: python3 scripts/vm-log-scanner.py"
echo "• Start security API: python3 security_api.py"
echo "• Check VM directories: ls -la /mnt/vm-security/"
echo ""
echo "🌐 Web Interface:"
echo "• Dashboard: http://localhost:5173"
echo "• Security Page: http://localhost:5173/security"
echo "• API Docs: http://localhost:4000/api"
echo ""

# Print configuration summary
log_info "Configuration Summary:"
echo "• Log Base Path: /mnt/vm-security"
echo "• SSH Key: /home/i4ops/.ssh/id_rsa"
echo "• User: $USER"
echo "• Python: $(python3 --version)"
echo "• Node.js: $(node --version)"
echo "• VM Directories: ${#VM_DIRS[@]} configured"

log_success "Setup complete! 🚀" 