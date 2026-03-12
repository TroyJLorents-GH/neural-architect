variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "neural-architect"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "node_count" {
  description = "Number of AKS nodes"
  type        = number
  default     = 1
}

variable "node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_B2s"
}

variable "enable_cosmos" {
  description = "Whether to create a Cosmos DB account"
  type        = bool
  default     = false
}
