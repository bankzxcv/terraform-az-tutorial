output "vm_public_ip" {
  description = "Public IP address of the ELK VM"
  value       = azurerm_public_ip.elk.ip_address
}

output "kibana_url" {
  description = "URL to access Kibana"
  value       = "http://${azurerm_public_ip.elk.ip_address}:5601"
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.elk.ip_address}"
}

output "elasticsearch_endpoint" {
  description = "Elasticsearch endpoint (internal)"
  value       = "http://${azurerm_network_interface.elk.private_ip_address}:9200"
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.elk.name
}
