output "api_gateway_url" {
  description = "API Gateway URL for the webhook"
  value       = aws_api_gateway_deployment.webhook.invoke_url
}

output "api_gateway_stage_url" {
  description = "API Gateway stage URL for the webhook"
  value       = "${aws_api_gateway_deployment.webhook.invoke_url}${aws_api_gateway_stage.webhook.stage_name}"
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.webhook.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.webhook.arn
}