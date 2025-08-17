terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Build Lambda deployment package
resource "null_resource" "lambda_build" {
  triggers = {
    lambda_code_hash = data.archive_file.lambda_zip.output_base64sha256
  }

  provisioner "local-exec" {
    command = "cd ${path.module} && npm install --production"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}"
  output_path = "${path.module}/function.zip"
  excludes    = ["main.tf", "variables.tf", "outputs.tf", "terraform.tfvars", "terraform.tfvars.example", ".terraform", "*.tfstate*", "function.zip"]
  
  depends_on = [null_resource.lambda_build]
}

# Use the Twilio VAPI webhook module
module "twilio_vapi_webhook" {
  source = "../terraform/modules/twilio-vapi-webhook"

  project_name        = var.project_name
  environment         = var.environment
  lambda_zip_path     = data.archive_file.lambda_zip.output_path
  vapi_api_key        = var.vapi_api_key
  vapi_endpoint       = var.vapi_endpoint
  twilio_auth_token   = var.twilio_auth_token

  tags = var.tags
}