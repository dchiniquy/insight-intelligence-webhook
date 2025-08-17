# Twilio to VAPI Integration Webhook

A serverless webhook integration that connects Twilio phone calls to VAPI AI assistants using AWS Lambda and API Gateway.

## Architecture

- **AWS API Gateway**: Receives webhook calls from Twilio
- **AWS Lambda**: Processes webhook events and integrates with VAPI
- **Terraform**: Infrastructure as Code for deployment
- **Node.js**: Lambda function runtime

## Project Structure

```
├── insight-intelligence-corp/    # Company-specific deployment
│   ├── index.js                 # Lambda webhook handler
│   ├── package.json             # Lambda dependencies
│   ├── .gitignore              # Node.js gitignore
│   ├── main.tf                 # Company Terraform configuration
│   ├── variables.tf            # Company-specific variables
│   ├── outputs.tf              # Company-specific outputs
│   └── terraform.tfvars.example # Example configuration
├── terraform/                   # Shared infrastructure modules
│   └── modules/
│       └── twilio-vapi-webhook/ # Reusable Terraform module
│           ├── main.tf         # API Gateway + Lambda resources
│           ├── variables.tf    # Module variables
│           └── outputs.tf      # Module outputs
├── deploy.sh                    # Multi-company deployment script
├── destroy.sh                   # Multi-company cleanup script
└── README.md                   # This file
```

### Adding New Companies

To add a new company webhook:

1. **Copy the company template**:
   ```bash
   cp -r insight-intelligence-corp your-company-name
   ```

2. **Update company-specific configurations**:
   ```bash
   cd your-company-name
   # Edit variables.tf to set default project_name
   # Edit terraform.tfvars.example with company-specific values
   # Optionally customize index.js for company-specific logic
   ```

3. **Deploy**:
   ```bash
   ./deploy.sh your-company-name
   ```

## Prerequisites

- [Terraform](https://terraform.io) >= 1.0
- [Node.js](https://nodejs.org) >= 18
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- Twilio account with phone number
- VAPI account with API key

## Setup

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd insight-intelligence-webhook
   ```

2. **Configure variables for your company**:
   ```bash
   cd insight-intelligence-corp  # or your company directory
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

3. **Required variables in terraform.tfvars**:
   ```hcl
   project_name = "insight-intelligence-corp"  # or your company name
   vapi_api_key = "your-vapi-api-key"
   twilio_auth_token = "your-twilio-auth-token"
   aws_region = "us-east-1"
   environment = "dev"
   ```

## Deployment

Deploy the infrastructure for a specific company:
```bash
# Deploy for insight-intelligence-corp (default)
./deploy.sh

# Deploy for a specific company
./deploy.sh your-company-name
```

This will:
- Install Lambda dependencies for the company
- Build the deployment package
- Deploy AWS infrastructure via Terraform
- Output the webhook URL for that company

## Configuration

1. **Configure Twilio Webhook**:
   - Copy the webhook URL from the deployment output
   - In Twilio Console, go to Phone Numbers → Manage → Active numbers
   - Select your phone number
   - Set the webhook URL in the "A call comes in" field
   - Set HTTP method to POST

2. **VAPI Configuration**:
   - Ensure your VAPI assistant is configured
   - Optionally set `VAPI_ASSISTANT_ID` environment variable in the Lambda function

## Testing

1. Call your Twilio phone number
2. The call should be connected to your VAPI assistant
3. Monitor logs in AWS CloudWatch

## Monitoring

Check Lambda function logs:
```bash
# For insight-intelligence-corp
aws logs tail /aws/lambda/insight-intelligence-corp-dev-twilio-vapi-webhook --follow

# For other companies, replace the company name
aws logs tail /aws/lambda/your-company-name-dev-twilio-vapi-webhook --follow
```

## Cleanup

To destroy infrastructure for a specific company:
```bash
# Destroy for insight-intelligence-corp (default)
./destroy.sh

# Destroy for a specific company
./destroy.sh your-company-name
```

## Webhook Events

The Lambda function handles these Twilio webhook events:
- `ringing`: Incoming call starts VAPI session
- `answered`: Call connected, logging
- `completed`: Call ended, cleanup VAPI session

## Security

- Twilio webhook signature validation
- AWS IAM roles with minimal permissions
- Sensitive variables marked as sensitive in Terraform
- API keys stored as Lambda environment variables

## Troubleshooting

1. **Deployment fails**: Check AWS credentials and permissions
2. **Webhook not receiving calls**: Verify Twilio webhook URL configuration
3. **VAPI integration issues**: Check API key and endpoint configuration
4. **Lambda errors**: Check CloudWatch logs for detailed error messages
