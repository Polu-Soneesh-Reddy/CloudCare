output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.cloudcare.id
}

output "public_ip" {
  description = "Elastic IP address of the CloudCare server"
  value       = aws_eip.cloudcare.public_ip
}

output "public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.cloudcare.public_dns
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i ~/.ssh/cloudcare_key ubuntu@${aws_eip.cloudcare.public_ip}"
}

output "app_url" {
  description = "CloudCare application URL"
  value       = "http://${aws_eip.cloudcare.public_ip}"
}

output "api_docs_url" {
  description = "FastAPI Swagger docs URL"
  value       = "http://${aws_eip.cloudcare.public_ip}:8000/docs"
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "http://${aws_eip.cloudcare.public_ip}:3000"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://${aws_eip.cloudcare.public_ip}:9090"
}

output "jenkins_url" {
  description = "Jenkins URL"
  value       = "http://${aws_eip.cloudcare.public_ip}:8080"
}
``
