# Neat Fleets Services Website

## Purpose

This project contains a static business website for **Neat Fleets Services**.

The website is designed to present and promote these services:

- Moving
- Haul away
- Trash removal
- Local delivery

The goal of the website is to:

- explain the business clearly
- show service pictures and business information
- let customers find contact details quickly
- support a custom domain with HTTPS
- stay simple and inexpensive to host and maintain

## What This Project Contains

This repository includes:

- a static frontend website
- Terraform files to create the AWS infrastructure
- a deploy script for first deployment and infrastructure changes
- a destroy script to remove the AWS resources
- a GitHub Actions workflow for automatic website updates

## Main Folders And Files

- Website files: `/Users/josephmbatchou/Documents/neatfleets-website/website`
- Terraform files: `/Users/josephmbatchou/Documents/neatfleets-website/terraform`
- Deploy script: `/Users/josephmbatchou/Documents/neatfleets-website/deploy.sh`
- Destroy script: `/Users/josephmbatchou/Documents/neatfleets-website/destroy.sh`
- GitHub Actions workflow: `/Users/josephmbatchou/Documents/neatfleets-website/.github/workflows/deploy.yml`

## Architecture

The website is hosted as a static site on AWS using:

- Amazon S3 for website files
- Amazon CloudFront for secure delivery and caching
- AWS Certificate Manager for HTTPS certificates
- Amazon Route 53 for DNS
- GitHub Actions for automatic deployment after updates

### AWS Region Behavior

- S3 bucket is created in `us-west-2`
- CloudFront is a global AWS service
- Route 53 is a global AWS service
- ACM certificate for CloudFront is created in `us-east-1`

This is the normal AWS requirement for CloudFront HTTPS.

## Domain Behavior

The intended public website is:

- `https://www.neatfleets-services.com`

The root domain:

- `https://neatfleets-services.com`

redirects to the `www` domain.

## Requirements Before Running

Before using this project, make sure you have:

- an AWS account
- Terraform installed
- AWS CLI installed
- AWS credentials configured
- ownership of the domain `neatfleets-services.com`
- a Route 53 hosted zone for `neatfleets-services.com`

Configure AWS CLI if needed:

```bash
aws configure
```

## How It Runs

There are two main parts:

1. Infrastructure creation
2. Website content deployment

### First Deployment

Run the deploy script from the project root:

```bash
chmod +x deploy.sh destroy.sh
./deploy.sh
```

This script will:

1. ask for the domain and region values
2. run Terraform
3. create the S3 bucket, CloudFront distribution, ACM certificate, and Route 53 records
4. upload the website files to S3
5. invalidate CloudFront so the latest version appears online

## Automatic Updates After Changes

After the first deployment, updates can be automatic.

If you change files inside:

- `/Users/josephmbatchou/Documents/neatfleets-website/website`

and push the changes to the `main` branch, GitHub Actions will:

1. upload the new files to S3
2. invalidate CloudFront
3. publish the new version of the website

This means you do not need to rebuild an application for normal website changes.

## GitHub Actions Setup

To enable automatic deployment, configure these in the GitHub repository.

### GitHub Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### GitHub Variables

- `AWS_REGION`
- `BUCKET_NAME`
- `DISTRIBUTION_ID`

Get the bucket and distribution values after Terraform deployment:

```bash
cd /Users/josephmbatchou/Documents/neatfleets-website/terraform
terraform output -raw bucket_name
terraform output -raw distribution_id
```

## How To Operate The Project

### To update the website content

1. edit files in `/Users/josephmbatchou/Documents/neatfleets-website/website`
2. commit the changes
3. push to the `main` branch
4. wait for GitHub Actions to finish
5. refresh the browser

### To change infrastructure

If you modify Terraform files, run:

```bash
./deploy.sh
```

### To remove the AWS resources

Run:

```bash
./destroy.sh
```

This removes the infrastructure managed by Terraform.

## What Terraform Creates

Terraform creates:

- the S3 bucket
- the CloudFront distribution
- the ACM certificate for the website domain
- the Route 53 DNS records
- the redirect behavior from root domain to `www`

Terraform does not create:

- the original domain purchase
- the initial Route 53 hosted zone if it does not already exist

## Notes

- The contact form is currently static and does not send real submissions.
- Before production use, replace placeholder contact values with real business details.
- For normal content changes, no build step is required.


## 🤝 Contribution

Pull requests are welcome. For major changes, please open an issue first.

## 👨‍💻 Author

**Joseph Mbatchou**

• DevOps / Cloud / Platform  Engineer   
• Content Creator / AWS Builder

## 🔗 Connect With Me

🌐 Website: [https://platform.joebahocloud.com](https://platform.joebahocloud.com)

💼 LinkedIn: [https://www.linkedin.com/in/josephmbatchou/](https://www.linkedin.com/in/josephmbatchou/)

🐦 X/Twitter: [https://www.twitter.com/Joebaho237](https://www.twitter.com/Joebaho237)

▶️ YouTube: [https://www.youtube.com/@josephmbatchou5596](https://www.youtube.com/@josephmbatchou5596)

🔗 Github: [https://github.com/Joebaho](https://github.com/Joebaho)

📦 Dockerhub: [https://hub.docker.com/u/joebaho2](https://hub.docker.com/u/joebaho2)

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.