#!/bin/bash

# Deployment script for i4ops Dashboard
# Usage: ./deploy.sh [environment] [target_host]
# Example: ./deploy.sh u0 100.76.195.14

set -e

ENVIRONMENT=${1:-"u0"}
TARGET_HOST=${2:-"100.76.195.14"}
REMOTE_USER=${3:-"i4ops"}
REMOTE_PATH="/home/$REMOTE_USER/i4ops-dashboard"

echo "Deploying i4ops Dashboard to $ENVIRONMENT environment"
echo "Target: $REMOTE_USER@$TARGET_HOST:$REMOTE_PATH"

# Step 1: Build for target environment
echo "Building for $ENVIRONMENT environment..."
npm run build:$ENVIRONMENT

# Step 2: Create deployment archive
echo "Creating deployment package..."
tar -czf dist-$ENVIRONMENT.tar.gz -C dist .

# Step 3: Upload to target server
echo "Uploading to $TARGET_HOST..."
scp dist-$ENVIRONMENT.tar.gz $REMOTE_USER@$TARGET_HOST:/tmp/

# Step 4: Deploy on remote server
echo "Deploying on remote server..."
ssh $REMOTE_USER@$TARGET_HOST << EOF
    # Create app directory if it doesn't exist
    mkdir -p $REMOTE_PATH/dashboard
    
    # Backup existing deployment (if any)
    if [ -d "$REMOTE_PATH/dashboard/current" ]; then
        mv $REMOTE_PATH/dashboard/current $REMOTE_PATH/dashboard/backup-\$(date +%Y%m%d-%H%M%S)
    fi
    
    # Extract new deployment
    mkdir -p $REMOTE_PATH/dashboard/current
    cd $REMOTE_PATH/dashboard/current
    tar -xzf /tmp/dist-$ENVIRONMENT.tar.gz
    
    # Clean up
    rm /tmp/dist-$ENVIRONMENT.tar.gz
    
    echo "Dashboard deployed successfully to $REMOTE_PATH/dashboard/current"
    echo "Access via: http://$TARGET_HOST:8888"
EOF

# Step 5: Clean up local files
rm dist-$ENVIRONMENT.tar.gz

echo ""
echo "Deployment complete!"
echo "Dashboard should be available at: http://$TARGET_HOST:8888"
echo ""
echo "Next steps:"
echo "   1. SSH to $TARGET_HOST"
echo "   2. Navigate to $REMOTE_PATH/dashboard/current" 
echo "   3. Run: python3 -m http.server 8888"
echo "   4. Or set up nginx/apache to serve the static files"
echo ""
echo "For backend deployment, make sure:"
echo "   1. Server is running on port 4000"
echo "   2. CORS allows connections from $TARGET_HOST:8888"
echo "   3. Environment variables are set correctly" 