# Outputs for simple deployment

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.demo_app.metadata[0].name
}

output "deployment_name" {
  description = "Deployment name"
  value       = kubernetes_deployment.demo_app.metadata[0].name
}

output "service_name" {
  description = "Service name"
  value       = kubernetes_service.demo_app.metadata[0].name
}

output "service_cluster_ip" {
  description = "Service cluster IP"
  value       = kubernetes_service.demo_app.spec[0].cluster_ip
}

output "load_balancer_ip" {
  description = "LoadBalancer IP (if created)"
  value       = var.create_load_balancer ? try(kubernetes_service.demo_app_lb[0].status[0].load_balancer[0].ingress[0].ip, "pending") : null
}

output "load_balancer_hostname" {
  description = "LoadBalancer hostname (if created)"
  value       = var.create_load_balancer ? try(kubernetes_service.demo_app_lb[0].status[0].load_balancer[0].ingress[0].hostname, "pending") : null
}

output "hpa_name" {
  description = "Horizontal Pod Autoscaler name"
  value       = kubernetes_horizontal_pod_autoscaler_v2.demo_app.metadata[0].name
}

output "deployment_labels" {
  description = "Deployment labels"
  value       = kubernetes_deployment.demo_app.metadata[0].labels
}

output "app_endpoints" {
  description = "Application endpoints"
  value = {
    health  = "/health"
    ready   = "/ready"
    info    = "/info"
    metrics = "/metrics"
  }
}
