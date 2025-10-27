#!/bin/bash

echo "=========================================="
echo "Auto Email Linking - Setup Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if files exist
echo "1. Checking files..."

if [ -f "apps/crm_pp/crm_pp/overrides/multi_account_auto_link.py" ]; then
    echo -e "   ${GREEN}✓${NC} multi_account_auto_link.py exists"
else
    echo -e "   ${RED}✗${NC} multi_account_auto_link.py NOT FOUND"
    exit 1
fi

if [ -f "apps/crm_pp/crm_pp/overrides/__init__.py" ]; then
    echo -e "   ${GREEN}✓${NC} __init__.py exists in overrides/"
else
    echo -e "   ${RED}✗${NC} __init__.py NOT FOUND in overrides/"
    exit 1
fi

if grep -q "crm_pp.overrides.multi_account_auto_link.auto_link_all_emails" "apps/crm_pp/crm_pp/hooks.py"; then
    echo -e "   ${GREEN}✓${NC} Scheduler configured in hooks.py"
else
    echo -e "   ${RED}✗${NC} Scheduler NOT configured in hooks.py"
    exit 1
fi

if [ -f "apps/crm_pp/test_auto_link.py" ]; then
    echo -e "   ${GREEN}✓${NC} Test script exists"
else
    echo -e "   ${YELLOW}!${NC} Test script not found (optional)"
fi

if [ -f "apps/crm_pp/AUTO_EMAIL_LINKING.md" ]; then
    echo -e "   ${GREEN}✓${NC} Documentation exists"
else
    echo -e "   ${YELLOW}!${NC} Documentation not found (optional)"
fi

echo ""
echo "2. Syntax check..."

if python3 -m py_compile apps/crm_pp/crm_pp/overrides/multi_account_auto_link.py 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} Python syntax is valid"
else
    echo -e "   ${RED}✗${NC} Python syntax error detected"
    python3 -m py_compile apps/crm_pp/crm_pp/overrides/multi_account_auto_link.py
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}All checks passed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Restart the bench:"
echo "   bench restart"
echo ""
echo "2. Test the functionality (replace [your-site] with your site name):"
echo "   bench --site [your-site] execute crm_pp.test_auto_link.test_auto_link"
echo ""
echo "3. Enable scheduler if not already enabled:"
echo "   bench --site [your-site] enable-scheduler"
echo ""
echo "4. Check scheduler status:"
echo "   bench --site [your-site] scheduler status"
echo ""
echo "5. View logs after a few minutes:"
echo "   cat sites/[your-site]/private/logs/auto_link_log.txt"
echo ""
echo "For detailed documentation, see:"
echo "   apps/crm_pp/AUTO_EMAIL_LINKING.md"
echo ""


