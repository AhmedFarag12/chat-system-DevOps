output "public_ip" {
  value = aws_instance.chat.public_ip
}

output "ssh" {
  value = "ssh ubuntu@${aws_instance.chat.public_ip}"
}
