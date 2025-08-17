variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "twilio-vapi-webhook"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "twilio-vapi-webhook"
}

variable "lambda_zip_path" {
  description = "Path to the Lambda deployment zip file"
  type        = string
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}