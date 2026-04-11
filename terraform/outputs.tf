output "website_url" {
  value = "https://${var.domain_name}"
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "pipeline_url" {
  value = "https://console.aws.amazon.com/codesuite/codepipeline/pipelines/neatfleets-pipeline/view"
}