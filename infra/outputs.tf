output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  value     = azurerm_container_registry.main.admin_username
  sensitive = true
}

output "acr_admin_password" {
  value     = azurerm_container_registry.main.admin_password
  sensitive = true
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "cosmos_endpoint" {
  value = var.enable_cosmos ? azurerm_cosmosdb_account.main[0].endpoint : null
}

output "cosmos_primary_key" {
  value     = var.enable_cosmos ? azurerm_cosmosdb_account.main[0].primary_key : null
  sensitive = true
}
