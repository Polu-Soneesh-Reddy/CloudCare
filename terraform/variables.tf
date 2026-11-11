variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"  # Mumbai — closest to India
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "cloudcare"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"  # 2 vCPU, 4 GB RAM
}

variable "ami_id" {
  description = "Ubuntu 22.04 LTS AMI (ap-south-1)"
  type        = string
  default     = "ami-0e35ddab05955cf57"  # Ubuntu 22.04 LTS in ap-south-1
}

variable "public_key_path" {
  description = "Path to your SSH public key file"
  type        = string
  default     = "~/.ssh/cloudcare_key.pub"
}

