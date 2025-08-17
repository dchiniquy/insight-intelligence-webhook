#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get company name from command line argument or default to insight-intelligence-corp
COMPANY_NAME=${1:-insight-intelligence-corp}

echo -e "${YELLOW}Destroying Twilio to VAPI Webhook Infrastructure for ${COMPANY_NAME}${NC}"

# Check if company directory exists
if [ ! -d "$COMPANY_NAME" ]; then
    echo -e "${RED}Error: Company directory '$COMPANY_NAME' not found${NC}"
    echo -e "${YELLOW}Available companies:${NC}"
    ls -d */ | grep -v terraform | sed 's|/||'
    exit 1
fi

# Navigate to company directory
cd "$COMPANY_NAME"

echo -e "${YELLOW}Planning Terraform destruction...${NC}"
terraform plan -destroy

echo -e "${RED}This will destroy all infrastructure for ${COMPANY_NAME}. Are you sure? (yes/no)${NC}"
read -r response

if [ "$response" = "yes" ]; then
    echo -e "${YELLOW}Destroying Terraform resources...${NC}"
    terraform destroy
    echo -e "${GREEN}Infrastructure destroyed successfully for ${COMPANY_NAME}!${NC}"
else
    echo -e "${YELLOW}Destruction cancelled.${NC}"
fi