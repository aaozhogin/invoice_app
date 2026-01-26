#!/bin/bash

# Execute SQL via curl to Supabase Management API
# This script creates all the necessary tables

# Load from environment (export these before running this script)
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
PROJECT_REF="${PROJECT_REF:-nnhlaceytkfyvqppzgle}"

echo "🚀 Executing SQL migrations via HTTP..."
echo ""

# Read the SQL file
SQL_FILE="migrations/SETUP_SQL_EDITOR.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

# Function to execute SQL statement
execute_sql() {
  local sql="$1"
  local description="$2"
  
  echo "Executing: $description"
  
  # Try using Supabase Management API
  response=$(curl -s -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$sql" | jq -Rs .)}" \
    2>&1)
  
  if echo "$response" | grep -q "error"; then
    echo "  ⚠️  $response"
  else
    echo "  ✓ Success"
  fi
}

# Create tables one by one
echo "1️⃣  Creating organizations table..."
execute_sql "CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);" "organizations table"

echo ""
echo "2️⃣  Creating user_role_enum type..."
execute_sql "DO \$\$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'superadmin',
        'administrator',
        'service_provider',
        'carer',
        'customer',
        'support_coordinator'
    );
EXCEPTION WHEN duplicate_object THEN null;
END \$\$;" "user_role_enum type"

echo ""
echo "✅ Attempted to create tables via API"
echo ""
echo "⚠️  Note: If this doesn't work, you'll need to manually run:"
echo "   migrations/SETUP_SQL_EDITOR.sql"
echo "   in the Supabase SQL Editor at:"
echo "   https://app.supabase.com/project/$PROJECT_REF/sql/new"
