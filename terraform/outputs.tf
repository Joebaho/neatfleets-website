output "bucket_name" {
  value = aws_s3_bucket.website.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "website_url" {
  value = "https://${var.domain_name}"
}
