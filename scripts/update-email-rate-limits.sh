#!/bin/bash

# Script to update Supabase Auth email rate limits
# Documentation: https://supabase.com/docs/guides/auth/rate-limits

# Get your access token from https://supabase.com/dashboard/account/tokens
# Get your project ref from your Supabase project URL

echo "Supabase Email Rate Limit Configuration"
echo "========================================"
echo ""

# Check if environment variables are set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "Error: SUPABASE_ACCESS_TOKEN is not set"
    echo "Get your access token from: https://supabase.com/dashboard/account/tokens"
    exit 1
fi

if [ -z "$PROJECT_REF" ]; then
    echo "Error: PROJECT_REF is not set"
    echo "Get your project ref from your Supabase project URL"
    exit 1
fi

echo "Project: $PROJECT_REF"
echo ""

# Get current rate limits
echo "Current Rate Limits:"
echo "-------------------"
curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq 'to_entries | map(select(.key | startswith("rate_limit_"))) | from_entries'

echo ""
echo ""

# Update rate limits
echo "Updating Email Rate Limits..."
echo "----------------------------"

# Set rate_limit_email_sent to a higher value (e.g., 100 emails per hour)
# Default is typically 3-4 per hour
# You can set this to any value you want, or even very high to effectively disable it

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limit_email_sent": 100
  }'

echo ""
echo ""

# Verify the update
echo "Updated Rate Limits:"
echo "-------------------"
curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq 'to_entries | map(select(.key | startswith("rate_limit_"))) | from_entries'

echo ""
echo ""
echo "✅ Rate limits updated successfully!"
echo ""
echo "Note: Changes may take a few minutes to propagate."
