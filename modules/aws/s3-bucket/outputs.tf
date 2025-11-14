# Outputs for AWS S3 Bucket Module

# Bucket
output "bucket_id" {
  description = "The name of the bucket"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "The ARN of the bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "The bucket region-specific domain name"
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "bucket_region" {
  description = "The AWS region this bucket resides in"
  value       = aws_s3_bucket.this.region
}

# Website
output "website_endpoint" {
  description = "The website endpoint, if the bucket is configured with a website"
  value       = var.website_config != null ? aws_s3_bucket_website_configuration.this[0].website_endpoint : null
}

output "website_domain" {
  description = "The domain of the website endpoint"
  value       = var.website_config != null ? aws_s3_bucket_website_configuration.this[0].website_domain : null
}

# Hosted Zone ID
output "hosted_zone_id" {
  description = "The Route 53 Hosted Zone ID for this bucket's region"
  value       = aws_s3_bucket.this.hosted_zone_id
}
