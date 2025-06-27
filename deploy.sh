#!/bin/bash

# ==========================================
# i4ops Dashboard Deployment Script
# ==========================================
# Usage: ./deploy.sh [environment] [target_host] [deployment_type]
# Examples:
#   ./deploy.sh production 192.168.1.100 docker
#   ./deploy.sh staging your.domain.com manual
#   ./deploy.sh local localhost docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-"production"}
TARGET_HOST=${2:-"localhost"}
DEPLOYMENT_TYPE=${3:-"docker"}
REMOTE_USER=${4:-"i4ops"}
REMOTE_PATH="/home/$REMOTE_USER/i4ops-dashboard"

# Function to print colored output
print_info() { echo -e "${BLUE}INFO: $1${NC}"; }
print_success() { echo -e "${GREEN}SUCCESS: $1${NC}"; }
print_warning() { echo -e "${YELLOW}WARNING: $1${NC}"; }
print_error() { echo -e "${RED}ERROR: $1${NC}"; }

print_info "Starting i4ops Dashboard deployment"
print_info "Environment: $ENVIRONMENT"
print_info "Target Host: $TARGET_HOST"
print_info "Deployment Type: $DEPLOYMENT_TYPE"

# ==========================================
# Pre-deployment Checks
# ==========================================
print_info "Running pre-deployment checks..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found! Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if required commands are available
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is required but not installed."
        exit 1
    fi
}

if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    check_command docker
    check_command docker-compose
else
    check_command npm
    check_command scp
    check_command ssh
fi

print_success "Pre-deployment checks passed"

# ==========================================
# Docker Deployment
# ==========================================
if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    print_info "Starting Docker deployment..."
    
    # Load environment variables
    export $(cat .env | grep -v '^#' | xargs)
    export DEPLOYMENT_HOST=$TARGET_HOST
    
    if [ "$TARGET_HOST" = "localhost" ]; then
        # Local deployment
        print_info "Deploying locally with Docker Compose..."
        
        # Build and start services
        docker-compose down --remove-orphans
        docker-compose build --no-cache
        docker-compose up -d
        
        # Wait for services to be ready
        print_info "Waiting for services to start..."
        sleep 10
        
        # Run database migrations
        print_info "Running database migrations..."
        docker-compose exec backend npx prisma migrate deploy
        
        # Run health checks
        print_info "Running health checks..."
        for i in {1..30}; do
            if curl -f http://localhost:4000/api/health &>/dev/null; then
                print_success "Backend is healthy"
                break
            fi
            if [ $i -eq 30 ]; then
                print_error "Backend health check failed"
                exit 1
            fi
            sleep 2
        done
        
        for i in {1..30}; do
            if curl -f http://localhost:8888 &>/dev/null; then
                print_success "Frontend is healthy"
                break
            fi
            if [ $i -eq 30 ]; then
                print_error "Frontend health check failed"
                exit 1
            fi
            sleep 2
        done
        
        print_success "Local deployment completed successfully!"
        print_info "Dashboard available at: http://localhost:8888"
        print_info "API available at: http://localhost:4000"
        
    else
        # Remote deployment
        print_info "Deploying to remote host with Docker..."
        
        # Create deployment archive
        print_info "Creating deployment package..."
        tar -czf i4ops-deployment.tar.gz \
            docker-compose.yml \
            server/Dockerfile \
            server/package*.json \
            server/src \
            server/prisma \
            dashboard/Dockerfile \
            dashboard/package*.json \
            dashboard/src \
            dashboard/public \
            dashboard/nginx.conf \
            nginx \
            .env
        
        # Upload to remote server
        print_info "Uploading to $TARGET_HOST..."
        scp i4ops-deployment.tar.gz $REMOTE_USER@$TARGET_HOST:/tmp/
        
        # Deploy on remote server
        print_info "Deploying on remote server..."
        ssh $REMOTE_USER@$TARGET_HOST << EOF
            set -e
            
            # Create app directory
            mkdir -p $REMOTE_PATH
            cd $REMOTE_PATH
            
            # Backup existing deployment
            if [ -d "current" ]; then
                mv current backup-\$(date +%Y%m%d-%H%M%S) || true
            fi
            
            # Extract new deployment
            mkdir -p current
            cd current
            tar -xzf /tmp/i4ops-deployment.tar.gz
            
            # Set deployment host in environment
            sed -i "s/DEPLOYMENT_HOST=.*/DEPLOYMENT_HOST=$TARGET_HOST/" .env
            
            # Deploy with Docker Compose
            docker-compose down --remove-orphans || true
            docker-compose build --no-cache
            docker-compose up -d
            
            # Wait for services and run migrations
            sleep 15
            docker-compose exec -T backend npx prisma migrate deploy
            
            # Clean up
            rm /tmp/i4ops-deployment.tar.gz
            
            echo "SUCCESS: Remote deployment completed"
EOF
        
        # Clean up local files
        rm i4ops-deployment.tar.gz
        
        print_success "Remote Docker deployment completed!"
        print_info "Dashboard available at: http://$TARGET_HOST:8888"
        print_info "API available at: http://$TARGET_HOST:4000"
    fi

# ==========================================
# Manual Deployment
# ==========================================
elif [ "$DEPLOYMENT_TYPE" = "manual" ]; then
    print_info "Starting manual deployment..."
    
    # Build frontend
    print_info "Building frontend for $ENVIRONMENT..."
    cd dashboard
    npm ci
    
    # Set environment variables for build
    export VITE_API_BASE_URL=http://$TARGET_HOST:4000/api
    export VITE_API_HOST=$TARGET_HOST
    export VITE_API_PORT=4000
    npm run build
    
    # Create deployment archive
    print_info "Creating frontend package..."
    tar -czf ../frontend-dist.tar.gz -C dist .
    cd ..
    
    # Build backend
    print_info "Building backend..."
    cd server
    npm ci --only=production
    npm run build
    tar -czf ../backend-dist.tar.gz dist package*.json prisma
    cd ..
    
    # Upload to remote server
    if [ "$TARGET_HOST" != "localhost" ]; then
        print_info "Uploading to $TARGET_HOST..."
        scp frontend-dist.tar.gz backend-dist.tar.gz $REMOTE_USER@$TARGET_HOST:/tmp/
        
        # Deploy on remote server
        ssh $REMOTE_USER@$TARGET_HOST << EOF
            set -e
            
            # Create app directories
            mkdir -p $REMOTE_PATH/{frontend,backend}
            
            # Deploy frontend
            cd $REMOTE_PATH/frontend
            tar -xzf /tmp/frontend-dist.tar.gz
            
            # Deploy backend
            cd $REMOTE_PATH/backend
            tar -xzf /tmp/backend-dist.tar.gz
            
            # Install PM2 if not exists
            if ! command -v pm2 &> /dev/null; then
                npm install -g pm2
            fi
            
            # Start services with PM2
            cd $REMOTE_PATH/backend
            pm2 delete i4ops-backend || true
            pm2 start dist/index.js --name "i4ops-backend"
            
            pm2 delete i4ops-frontend || true
            pm2 serve $REMOTE_PATH/frontend 8888 --name "i4ops-frontend"
            
            pm2 save
            
            # Clean up
            rm /tmp/frontend-dist.tar.gz /tmp/backend-dist.tar.gz
            
            echo "SUCCESS: Manual deployment completed"
EOF
    fi
    
    # Clean up local files
    rm frontend-dist.tar.gz backend-dist.tar.gz
    
    print_success "Manual deployment completed!"
    print_info "Dashboard available at: http://$TARGET_HOST:8888"
    print_info "API available at: http://$TARGET_HOST:4000"
fi

# ==========================================
# Post-deployment Verification
# ==========================================
print_info "Running post-deployment verification..."

sleep 5

# Test API health
if curl -f http://$TARGET_HOST:4000/api/health &>/dev/null; then
    print_success "API health check passed"
else
    print_warning "API health check failed - service may still be starting"
fi

# Test frontend
if curl -f http://$TARGET_HOST:8888 &>/dev/null; then
    print_success "Frontend health check passed"
else
    print_warning "Frontend health check failed - service may still be starting"
fi

print_success "Deployment completed successfully!"
echo ""
print_info "Next steps:"
echo "   1. Verify all services are running: docker-compose ps (for Docker) or pm2 status (for manual)"
echo "   2. Check logs: docker-compose logs (for Docker) or pm2 logs (for manual)"
echo "   3. Access dashboard: http://$TARGET_HOST:8888"
echo "   4. Test API: curl http://$TARGET_HOST:4000/api/health"
echo ""
print_info "For production, consider:"
echo "   1. Setting up SSL certificates"
echo "   2. Configuring a reverse proxy (nginx)"
echo "   3. Setting up monitoring and alerting"
echo "   4. Implementing backup strategies" 