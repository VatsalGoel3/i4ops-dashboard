#!/bin/bash

# Fix Prisma Client Generation Issues
# Run this script from the server directory if you encounter Prisma errors

echo "Fixing Prisma client generation issues..."

# Clean up old generated client
echo "Cleaning old Prisma client..."
rm -rf node_modules/.prisma/client
rm -rf prisma/generated

# Update database enum values (PostgreSQL only)
if command -v psql &> /dev/null; then
    echo "Updating database enum values..."
    PGPASSWORD=i4ops123 psql -h localhost -U i4ops -d i4ops_dashboard -f update-enums.sql 2>/dev/null || echo "Enum update failed (may be normal)"
fi

# Force schema sync
echo "Syncing Prisma schema with database..."
npx prisma db push --accept-data-loss

# Regenerate client
echo "Regenerating Prisma client..."
npx prisma generate

# Verify generation
echo "Verifying Prisma client..."
if [ -d "node_modules/.prisma/client" ]; then
    echo "Prisma client generated successfully!"
else
    echo "Prisma client generation failed!"
    exit 1
fi

echo "Prisma issues should be resolved. Try building again." 