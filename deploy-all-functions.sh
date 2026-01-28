#!/bin/bash

# Master Deployment Script for All Moneko Functions
# Project: Moneko
# This script runs all individual deployment scripts with the specified project reference
#
# Usage: ./deploy-all-functions.sh [project_ref]
#   - If no project ref is provided, defaults to production
#   - Pass "dev" for development environment
#
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

# Determine project reference based on argument
PROJECT_REF="${1:-pbopcsmrcykdzbilpilf}"

if [ "$1" = "dev" ]; then
    PROJECT_REF="qbuynyxyemigtnvdujts"
    ENV_NAME="Development"
elif [ "$1" = "prod" ] || [ -z "$1" ]; then
    PROJECT_REF="pbopcsmrcykdzbilpilf"
    ENV_NAME="Production"
else
    ENV_NAME="Custom"
fi

echo "══════════════════════════════════════════════════════════════════════════════"
echo "  🚀 DEPLOYING ALL MONEKO FUNCTIONS"
echo "  Environment: $ENV_NAME"
echo "  Project Ref: $PROJECT_REF"
echo "══════════════════════════════════════════════════════════════════════════════"
echo ""

# Function to execute deployment script with project reference
deploy_script() {
    local script_name="$1"
    local script_path="$2"
    
    echo "══════════════════════════════════════════════════════════════════════════════"
    echo "  📦 Deploying: $script_name"
    echo "  Project Ref: $PROJECT_REF"
    echo "══════════════════════════════════════════════════════════════════════════════"
    echo ""
    
    # Create a temporary script with the correct project reference
    local temp_script=$(mktemp)
    cp "$script_path" "$temp_script"
    
    # Replace the hardcoded PROJECT_REF with our target project ref
    sed -i.bak "s/PROJECT_REF=\"pbopcsmrcykdzbilpilf\"/PROJECT_REF=\"$PROJECT_REF\"/g" "$temp_script"
    sed -i.bak "s/PROJECT_REF=\"qbuynyxyemigtnvdujts\"/PROJECT_REF=\"$PROJECT_REF\"/g" "$temp_script"
    
    # Make the temporary script executable and run it
    chmod +x "$temp_script"
    bash "$temp_script"
    
    # Clean up temporary files
    rm -f "$temp_script" "$temp_script.bak"
    
    echo ""
    echo "  ✅ $script_name completed successfully!"
    echo "══════════════════════════════════════════════════════════════════════════════"
    echo ""
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Deploy all scripts in order
echo "Starting deployment sequence..."
echo ""

deploy_script "Budgeting Functions" "$SCRIPT_DIR/deploy-budgeting-functions.sh"
deploy_script "Payments Functions" "$SCRIPT_DIR/deploy-payments-functions.sh"
deploy_script "Stripe Functions" "$SCRIPT_DIR/deploy-stripe-functions.sh"
deploy_script "Households Functions" "$SCRIPT_DIR/deploy-households-functions.sh"

echo "══════════════════════════════════════════════════════════════════════════════"
echo "  🎉 ALL DEPLOYMENTS COMPLETED SUCCESSFULLY!"
echo "══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Summary:"
echo "  ✅ Budgeting Functions deployed"
echo "  ✅ Payments Functions deployed"
echo "  ✅ Stripe Functions deployed"
echo "  ✅ Households Functions deployed"
echo ""
echo "🔧 Next Steps:"
echo "  1. Verify all functions are working in Supabase Dashboard"
echo "  2. Check function logs for any errors:"
echo "     supabase functions logs --project-ref $PROJECT_REF"
echo "  3. Test critical endpoints"
echo ""
echo "🌐 Environment Variables to verify in Supabase Dashboard:"
echo "  - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET"
echo "  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
echo "  - APP_STORE_SHARED_SECRET (for iOS IAP)"
echo "  - Any other required secrets for deployed functions"
echo ""
echo "🎉 Deployment complete! Your Moneko functions are now live."
