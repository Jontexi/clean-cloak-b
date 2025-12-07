#!/bin/bash

# ================================================================
# Clean Cloak Backend - Quick Deployment Script
# ================================================================
# This script commits and pushes backend changes to trigger
# auto-deployment on Render.com
# ================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Clean Cloak Backend Deployment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}Error: server.js not found!${NC}"
    echo -e "${YELLOW}Please run this script from the backend directory${NC}"
    exit 1
fi

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed${NC}"
    exit 1
fi

# Check if git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Warning: Not a git repository${NC}"
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    git remote add origin https://github.com/Jontexi/clean-cloak-b.git
fi

# Show current status
echo -e "${BLUE}Step 1: Checking for changes...${NC}"
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${YELLOW}No changes detected${NC}"
    echo -e "${GREEN}Backend is up to date!${NC}"
    exit 0
fi

git status --short

# Add changes
echo -e "\n${BLUE}Step 2: Staging changes...${NC}"
git add .
echo -e "${GREEN}✓ Changes staged${NC}"

# Show what will be committed
echo -e "\n${BLUE}Files to be committed:${NC}"
git diff --cached --name-only

# Commit
echo -e "\n${BLUE}Step 3: Creating commit...${NC}"
COMMIT_MSG="Update CORS configuration for new Netlify frontend

- Added https://rad-maamoul-c7a511.netlify.app
- Added APK support (capacitor://, ionic://, http://)
- Updated $(date '+%Y-%m-%d %H:%M:%S')"

git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓ Commit created${NC}"

# Push to GitHub
echo -e "\n${BLUE}Step 4: Pushing to GitHub...${NC}"
echo -e "${YELLOW}This will trigger auto-deployment on Render.com${NC}"

if git push origin main; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub!${NC}"
else
    echo -e "${RED}Push failed. Trying 'master' branch...${NC}"
    git push origin master
fi

# Success message
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT INITIATED${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Go to: ${YELLOW}https://dashboard.render.com${NC}"
echo -e "2. Find: ${YELLOW}clean-cloak-b${NC} service"
echo -e "3. Watch deployment progress (1-2 minutes)"
echo -e "4. Verify: ${YELLOW}https://clean-cloak-b.onrender.com/api/health${NC}\n"

echo -e "${BLUE}Verification:${NC}"
echo -e "After deployment completes, test with:"
echo -e "${YELLOW}curl https://clean-cloak-b.onrender.com/api/health${NC}\n"

echo -e "${GREEN}Deployment process started! 🚀${NC}"

exit 0
