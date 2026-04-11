#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Neat Fleets Website Deployment ===${NC}"

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "Terraform is required but not installed. Aborting." >&2; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "AWS CLI is required. Aborting." >&2; exit 1; }

# Optional: set variables
read -p "Enter your root domain (e.g., neatfleets-services.com): " ROOT_DOMAIN
read -p "Enter your full domain (e.g., www.neatfleets-services.com): " FULL_DOMAIN
read -p "Enter GitHub repo (e.g., youruser/neatfleets-website): " GITHUB_REPO

# Update terraform variables
cd terraform
cat > terraform.tfvars <<EOF
domain_name = "$FULL_DOMAIN"
root_domain = "$ROOT_DOMAIN"
github_repo = "$GITHUB_REPO"
github_branch = "main"
EOF

echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init

echo -e "${YELLOW}Planning infrastructure...${NC}"
terraform plan

echo -e "${GREEN}Do you want to apply? (yes/no)${NC}"
read CONFIRM
if [[ $CONFIRM == "yes" ]]; then
    terraform apply -auto-approve
    echo -e "${GREEN}Infrastructure deployed successfully!${NC}"
    echo -e "Website URL: $(terraform output -raw website_url)"
else
    echo "Deployment cancelled."
    exit 0
fi

# Output CloudFront ID for buildspec
CLOUDFRONT_ID=$(terraform output -raw cloudfront_domain | cut -d'.' -f1)
echo "CLOUDFRONT_ID=$CLOUDFRONT_ID" > ../build_env

echo -e "${GREEN}Next steps:${NC}"
echo "1. Go to AWS CodePipeline console and create a connection to your GitHub repo if not already done."
echo "2. Push your website code to GitHub branch 'main'."
echo "3. Pipeline will automatically deploy changes to S3 + invalidate CloudFront."