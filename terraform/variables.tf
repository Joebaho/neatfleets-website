variable "aws_region" {
  description = "AWS region"
  default     = "us-west-2"
}

variable "domain_name" {
  description = "Your custom domain (e.g., www.neatfleets-services.com)"
  default     = "www.neatfleets-services.com"
}

variable "root_domain" {
  description = "Root domain without www"
  default     = "neatfleets-services.com"
}

variable "github_repo" {
  description = "GitHub repository full name (e.g., youruser/neatfleets-website)"
  default     = "yourusername/neatfleets-website"
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  default     = "main"
}