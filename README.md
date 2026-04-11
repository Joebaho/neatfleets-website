# Neat Fleets Services Static Website

This repository now contains a full static website for:

- Moving services
- Haul away
- Trash removal
- Local delivery

The project is set up for the cheapest practical AWS production path for a custom domain with HTTPS:

- Amazon S3 for static files
- Amazon CloudFront for HTTPS and caching
- AWS Certificate Manager for SSL
- Route 53 for DNS

## Is the current project good enough?

Yes, now it is much closer to launch-ready than the original starter version.

The site has been improved to:

- Use local image assets instead of depending on third-party stock image URLs
- Better explain the business services
- Include more visual sections and clearer calls to action
- Include a real `error.html`
- Use a simpler AWS architecture with fewer moving parts

## Cheapest recommended way

If you want to stay on AWS, the cheapest solid option is:

1. Keep the site fully static
2. Host files in S3
3. Put CloudFront in front for HTTPS and performance
4. Manage DNS in Route 53
5. Upload updates with `aws s3 sync`

This is usually cheaper and simpler than adding CodePipeline and CodeBuild for a small marketing website.

## Automatic updates after changes

Yes, we can still make updates automatic without keeping the old AWS pipeline.

The cheapest clean option is:

1. Keep AWS hosting as `S3 + CloudFront + Route 53 + ACM`
2. Use GitHub Actions for automatic deployment
3. Every time you push a change to the `main` branch, GitHub uploads the updated `website/` files to S3 and invalidates CloudFront

That workflow file is:

- `/Users/josephmbatchou/Documents/neatfleets-website/.github/workflows/deploy.yml`

This is usually simpler and lower-cost than AWS CodePipeline for a small static website.

## Files

- Website: `/Users/josephmbatchou/Documents/neatfleets-website/website`
- Terraform infrastructure: `/Users/josephmbatchou/Documents/neatfleets-website/terraform`
- Deploy script: `/Users/josephmbatchou/Documents/neatfleets-website/deploy.sh`
- Destroy script: `/Users/josephmbatchou/Documents/neatfleets-website/destroy.sh`

## Before you deploy

Make sure you have:

- An AWS account
- AWS CLI installed and configured with credentials
- Terraform installed
- A Route 53 hosted zone for `neatfleets-services.com`

Configure AWS CLI first:

```bash
aws configure
```

## How to deploy

From the repository root:

```bash
chmod +x deploy.sh destroy.sh
./deploy.sh
```

The script will:

1. Ask for your domain and region
2. Run `terraform init`
3. Run `terraform plan`
4. Create the S3 bucket, ACM certificate, CloudFront distribution, and Route 53 records
5. Upload the files from `website/`
6. Create a CloudFront invalidation

After deployment:

- Visit `https://www.neatfleets-services.com`
- Give CloudFront and ACM a few minutes if DNS or certificate validation is still propagating

## How to enable automatic deployment

After the infrastructure is created once, set these in your GitHub repository:

### GitHub Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### GitHub Repository Variables

- `AWS_REGION`
- `BUCKET_NAME`
- `DISTRIBUTION_ID`

You can get the bucket and distribution values from Terraform:

```bash
cd /Users/josephmbatchou/Documents/neatfleets-website/terraform
terraform output -raw bucket_name
terraform output -raw distribution_id
```

Then push changes to `main`. GitHub Actions will automatically deploy the update.

## How to update the website later

If you change files inside `website/`, run:

```bash
./deploy.sh
```

You can also do only the upload step manually after infrastructure already exists:

```bash
cd /Users/josephmbatchou/Documents/neatfleets-website/terraform
BUCKET_NAME="$(terraform output -raw bucket_name)"
DISTRIBUTION_ID="$(terraform output -raw distribution_id)"
aws s3 sync ../website/ "s3://${BUCKET_NAME}/" --delete
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*"
```

## How to destroy everything

Run:

```bash
./destroy.sh
```

That script will run:

```bash
terraform destroy -auto-approve
```

The S3 bucket is configured with `force_destroy = true`, so Terraform can remove uploaded files too.

## Important launch checklist

Before going live, replace these items with your real business details:

- Business phone number
- Final email inbox
- Exact service area
- Real social media profile links
- Any legal or policy pages you want in the footer

## Notes

- The contact form is static for now and shows a success message in the browser.
- If you want real submissions, a cheap next step is connecting it to Formspree or a lightweight email service.
- The Terraform setup assumes your root domain is already in Route 53.
