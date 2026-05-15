#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${ROOT_DIR}/terraform"

echo "Neat Fleets Services destroy"
echo "This will remove the AWS infrastructure managed by Terraform."
echo

command -v terraform >/dev/null 2>&1 || { echo "Terraform is required but not installed."; exit 1; }

read -r -p "Type destroy to continue: " CONFIRM
if [[ "${CONFIRM}" != "destroy" ]]; then
  echo "Destroy cancelled."
  exit 0
fi

cd "${TERRAFORM_DIR}"
terraform init
terraform destroy -auto-approve

echo
echo "Infrastructure removed."
