#!/bin/bash

# ============================================
# Huggy V1 - Supabase Quick Install Script
# ============================================

echo "🚀 Huggy V1 - Supabase Installation"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in your DATABASE_URL"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found, creating one...${NC}"
    cp .env.local.example .env.local 2>/dev/null || echo "
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:8080
" > .env.local
    echo -e "${GREEN}✅ .env.local created${NC}"
    echo "📝 Edit .env.local and add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Check if @supabase/supabase-js is installed
if ! grep -q "@supabase/supabase-js" package.json; then
    echo -e "${YELLOW}⚠️  Installing @supabase/supabase-js...${NC}"
    npm install @supabase/supabase-js
    echo -e "${GREEN}✅ @supabase/supabase-js installed${NC}"
fi

echo ""
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo ""
echo "📖 Next Steps:"
echo "1. Edit .env with your DATABASE_URL from Supabase"
echo "2. Edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
echo "3. Run: npm run dev"
echo ""
echo "📚 Documentation:"
echo "- SUPABASE_SETUP.md - Full setup guide"
echo "- SUPABASE_USAGE.md - Usage examples"
echo "- SUPABASE_CHECKLIST.md - Step-by-step checklist"
echo ""
