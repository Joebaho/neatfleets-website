#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${ROOT_DIR}/terraform"
WEBSITE_DIR="${ROOT_DIR}/website"
TFVARS_FILE="${TERRAFORM_DIR}/terraform.tfvars"

DEFAULT_ROOT_DOMAIN="neatfleets-services.com"
DEFAULT_FULL_DOMAIN="www.neatfleets-services.com"
DEFAULT_REGION="us-west-2"

echo "Neat Fleets Services deploy"
echo

command -v terraform >/dev/null 2>&1 || { echo "Terraform is required but not installed."; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "AWS CLI is required but not installed."; exit 1; }

read -r -p "Root domain [${DEFAULT_ROOT_DOMAIN}]: " ROOT_DOMAIN
ROOT_DOMAIN="${ROOT_DOMAIN:-$DEFAULT_ROOT_DOMAIN}"

read -r -p "Website domain [${DEFAULT_FULL_DOMAIN}]: " FULL_DOMAIN
FULL_DOMAIN="${FULL_DOMAIN:-$DEFAULT_FULL_DOMAIN}"

read -r -p "AWS region [${DEFAULT_REGION}]: " AWS_REGION
AWS_REGION="${AWS_REGION:-$DEFAULT_REGION}"

cat > "${TFVARS_FILE}" <<EOF
root_domain = "${ROOT_DOMAIN}"
domain_name = "${FULL_DOMAIN}"
aws_region  = "${AWS_REGION}"
EOF

cd "${TERRAFORM_DIR}"

echo
echo "Initializing Terraform..."
terraform init

echo
echo "Planning infrastructure..."
terraform plan

echo
read -r -p "Apply infrastructure now? [yes/no]: " APPLY_CONFIRM
if [[ "${APPLY_CONFIRM}" != "yes" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

terraform apply -auto-approve

BUCKET_NAME="$(terraform output -raw bucket_name)"
DISTRIBUTION_ID="$(terraform output -raw distribution_id)"
WEBSITE_URL="$(terraform output -raw website_url)"

echo
echo "Uploading website files to S3..."
aws s3 sync "${WEBSITE_DIR}/" "s3://${BUCKET_NAME}/" --delete

echo
echo "Creating CloudFront invalidation..."
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*" >/dev/null

echo
echo "Deployment complete."
echo "Website URL: ${WEBSITE_URL}"
echo "CloudFront may take a few minutes to finish the first distribution update."
