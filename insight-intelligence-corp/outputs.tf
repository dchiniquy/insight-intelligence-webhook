output "webhook_url" {
  description = "Webhook URL to configure in Twilio"
  value       = module.twilio_vapi_webhook.api_gateway_stage_url
}

output "api_gateway_url" {
  description = "Base API Gateway URL"
  value       = module.twilio_vapi_webhook.api_gateway_url
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = module.twilio_vapi_webhook.lambda_function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = module.twilio_vapi_webhook.lambda_function_arn
}