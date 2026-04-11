# Neat Fleets Website – Full Automation

## Prerequisites
- AWS account with CLI configured (`aws configure`)
- Terraform installed
- GitHub repository with your website code
- Domain hosted on Route53 (or you can transfer DNS)

## Setup

1. Clone this repo and navigate to root.
2. Run `./deploy.sh` and follow prompts.
3. After Terraform applies, go to AWS Console → CodePipeline → Settings → Connections.
   - Create a GitHub connection for the `aws_codestarconnections_connection` resource.
   - Update the pipeline source stage with that connection ARN if needed (or Terraform will auto-create but you must manually complete the connection).
4. Push your website files to GitHub `main` branch.
5. Pipeline will deploy. Website will be live at `https://www.neatfleets-services.com`.

## Manual sync (if pipeline not ready)
```bash
aws s3 sync ./website/ s3://www.neatfleets-services.com/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"