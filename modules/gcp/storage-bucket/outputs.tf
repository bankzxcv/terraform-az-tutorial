output "bucket_name" {
  description = "Name of the created bucket"
  value       = google_storage_bucket.bucket.name
}

output "bucket_url" {
  description = "URL of the bucket"
  value       = google_storage_bucket.bucket.url
}

output "bucket_self_link" {
  description = "Self-link of the bucket"
  value       = google_storage_bucket.bucket.self_link
}

output "bucket_id" {
  description = "ID of the bucket"
  value       = google_storage_bucket.bucket.id
}

output "bucket_location" {
  description = "Location of the bucket"
  value       = google_storage_bucket.bucket.location
}

output "bucket_storage_class" {
  description = "Storage class of the bucket"
  value       = google_storage_bucket.bucket.storage_class
}
