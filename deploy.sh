#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get company name from command line argument or default to insight-intelligence-corp
COMPANY_NAME=${1:-insight-intelligence-corp}

echo -e "${YELLOW}Deploying Twilio to VAPI Webhook Infrastructure for ${COMPANY_NAME}${NC}"

# Check if company directory exists
if [ ! -d "$COMPANY_NAME" ]; then
    echo -e "${RED}Error: Company directory '$COMPANY_NAME' not found${NC}"
    echo -e "${YELLOW}Available companies:${NC}"
    ls -d */ | grep -v terraform | sed 's|/||'
    exit 1
fi

# Check if terraform.tfvars exists
if [ ! -f "$COMPANY_NAME/terraform.tfvars" ]; then
    echo -e "${RED}Error: $COMPANY_NAME/terraform.tfvars not found${NC}"
    echo -e "${YELLOW}Please copy $COMPANY_NAME/terraform.tfvars.example to $COMPANY_NAME/terraform.tfvars and fill in your values${NC}"
    exit 1
fi

# Check if required tools are installed
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}Error: terraform is required but not installed${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: node is required but not installed${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is required but not installed${NC}"; exit 1; }

# Navigate to company directory
cd "$COMPANY_NAME"

echo -e "${YELLOW}Installing Lambda dependencies for ${COMPANY_NAME}...${NC}"
npm install --production

echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init

echo -e "${YELLOW}Planning Terraform deployment...${NC}"
terraform plan

echo -e "${YELLOW}Applying Terraform configuration...${NC}"
terraform apply

echo -e "${GREEN}Deployment completed successfully for ${COMPANY_NAME}!${NC}"
echo -e "${YELLOW}Your webhook URL is:${NC}"
terraform output -raw webhook_url

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Configure the webhook URL in your Twilio phone number settings"
echo "2. Test the webhook by making a call to your Twilio number"
echo "3. Monitor the Lambda function logs in CloudWatch"