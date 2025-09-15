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

variable "source_code_hash" {
  description = "Base64-encoded SHA256 hash of the Lambda deployment package"
  type        = string
}

variable "secrets_name" {
  description = "Name of the AWS Secrets Manager secret containing API keys"
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

variable "vapi_assistant_id" {
  description = "VAPI assistant ID to use for calls"
  type        = string
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio auth token for webhook validation"
  type        = string
  sensitive   = true
}

variable "phone_routing_enabled" {
  description = "Enable phone routing and forwarding"
  type        = bool
  default     = true
}

variable "phone_routing_map" {
  description = "JSON string mapping incoming phone numbers to target numbers"
  type        = string
  default     = "{}"
}

variable "default_forward_timeout" {
  description = "Default timeout in seconds for call forwarding"
  type        = number
  default     = 30
}

variable "vapi_fallback_enabled" {
  description = "Enable VAPI fallback when calls are not answered"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}