variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "insight-intelligence-corp"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vapi_api_key" {
  description = "VAPI API key"
  type        = string
  sensitive   = true
}

variable "vapi_endpoint" {
  description = "VAPI endpoint URL"
  type        = string
  default     = "https://api.vapi.ai"
}

variable "twilio_auth_token" {
  description = "Twilio auth token for webhook validation"
  type        = string
  sensitive   = true
}

variable "vapi_assistant_id" {
  description = "VAPI assistant ID to use for calls"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project     = "insight-intelligence-corp"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}