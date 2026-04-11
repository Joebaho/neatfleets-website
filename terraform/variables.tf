variable "project_name" {
  description = "Short project name used in AWS resources."
  type        = string
  default     = "neatfleets"
}

variable "aws_region" {
  description = "Primary AWS region for the S3 bucket and Route 53 lookups."
  type        = string
  default     = "us-west-2"
}

variable "domain_name" {
  description = "Full website domain."
  type        = string
  default     = "www.neatfleets-services.com"
}

variable "root_domain" {
  description = "Root domain hosted in Route 53."
  type        = string
  default     = "neatfleets-services.com"
}

variable "canonical_domain" {
  description = "Preferred hostname for public traffic."
  type        = string
  default     = "www.neatfleets-services.com"
}
