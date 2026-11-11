terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── VPC ──────────────────────────────────────────────
resource "aws_vpc" "cloudcare" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc", Project = var.project_name }
}

# ─── Internet Gateway ─────────────────────────────────
resource "aws_internet_gateway" "cloudcare" {
  vpc_id = aws_vpc.cloudcare.id
  tags   = { Name = "${var.project_name}-igw", Project = var.project_name }
}

# ─── Public Subnet ────────────────────────────────────
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.cloudcare.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = { Name = "${var.project_name}-public-subnet", Project = var.project_name }
}

# ─── Route Table ──────────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.cloudcare.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.cloudcare.id
  }
  tags = { Name = "${var.project_name}-rt", Project = var.project_name }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ─── Security Group ───────────────────────────────────
resource "aws_security_group" "cloudcare" {
  name        = "${var.project_name}-sg"
  description = "CloudCare application security group"
  vpc_id      = aws_vpc.cloudcare.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access"
  }
  # HTTP - Frontend
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP frontend"
  }
  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }
  # Backend API
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "FastAPI backend"
  }
  # Prometheus
  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Prometheus"
  }
  # Grafana
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Grafana"
  }
  # Jenkins
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Jenkins"
  }
  # Node Exporter
  ingress {
    from_port   = 9100
    to_port     = 9100
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "Node Exporter (internal)"
  }
  # All outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project_name}-sg", Project = var.project_name }
}

# ─── Key Pair ─────────────────────────────────────────
resource "aws_key_pair" "cloudcare" {
  key_name   = "${var.project_name}-key"
  public_key = file(var.public_key_path)
  tags       = { Project = var.project_name }
}

# ─── Latest Ubuntu 22.04 LTS AMI ──────────────────────
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

# ─── EC2 Instance ─────────────────────────────────────
resource "aws_instance" "cloudcare" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.cloudcare.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.cloudcare.id]

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
    tags        = { Name = "${var.project_name}-root-volume" }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    project_name = var.project_name
  }))

  tags = {
    Name    = "${var.project_name}-server"
    Project = var.project_name
    Env     = "production"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Elastic IP ───────────────────────────────────────
resource "aws_eip" "cloudcare" {
  instance = aws_instance.cloudcare.id
  domain   = "vpc"
  tags     = { Name = "${var.project_name}-eip", Project = var.project_name }
}

