# Neat Fleets Trash Removal Website

## Purpose

This project contains the website for **Neat Fleets Trash Removal**.

The website is focused only on:

- trash removal
- haul away

The main business use cases are:

- party organizers who need trash pickup after an event
- households that need trash taken away

The goal of the application is to let customers:

- understand what the company handles
- enter their pickup details
- upload pictures of the trash when available
- review a live booking estimate
- continue toward online payment

## Project Contents

This repository includes:

- a static frontend with dynamic booking behavior in the browser
- Terraform files for AWS hosting
- a deploy script
- a destroy script
- a GitHub Actions workflow for automatic updates

## Main Files

- Website: `/Users/josephmbatchou/Documents/neatfleets-website/website`
- Terraform: `/Users/josephmbatchou/Documents/neatfleets-website/terraform`
- Deploy script: `/Users/josephmbatchou/Documents/neatfleets-website/deploy.sh`
- Destroy script: `/Users/josephmbatchou/Documents/neatfleets-website/destroy.sh`
- GitHub Actions workflow: `/Users/josephmbatchou/Documents/neatfleets-website/.github/workflows/deploy.yml`

## Application Behavior

The website now allows a customer to enter:

- name
- email
- phone
- number of guests
- pickup location
- pickup date
- pickup time
- trash type
- pickup notes
- pictures of the trash

The frontend then:

- calculates a live estimate
- shows a suggested deposit
- previews uploaded pictures
- creates a booking summary before payment

## Hosting Model

The project is hosted as a static website on AWS using:

- Amazon S3
- Amazon CloudFront
- AWS Certificate Manager
- Amazon Route 53

Automatic website updates are handled by GitHub Actions.

## How It Runs

### First deployment

From the project root:

```bash
chmod +x deploy.sh destroy.sh
./deploy.sh
```

This does the following:

1. initializes Terraform
2. creates or updates the AWS infrastructure
3. uploads the website files to S3
4. invalidates CloudFront

## How To Operate It

### For normal website changes

1. edit files inside `/Users/josephmbatchou/Documents/neatfleets-website/website`
2. commit your changes
3. push to the `main` branch
4. GitHub Actions deploys the update automatically

You do not need an application build step for regular content or frontend changes.

### For infrastructure changes

If you change Terraform files, run:

```bash
./deploy.sh
```

### To destroy the infrastructure

Run:

```bash
./destroy.sh
```

## Automatic Deployment

The GitHub Actions workflow deploys the website automatically when files under `website/` change and are pushed to `main`.

To enable that workflow, the GitHub repository needs:

### Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Variables

- `AWS_REGION`
- `BUCKET_NAME`
- `DISTRIBUTION_ID`

## Important Note About Payments

The application now includes the booking review and payment step in the interface.

To make real online payment work in production, you still need to connect your live payment provider to the payment button in:

- `/Users/josephmbatchou/Documents/neatfleets-website/website/js/main.js`

## Notes

- The domain and certificate can stay as they are.
- The website focus is now only trash removal and haul away.
- Replace placeholder business contact details before production use.
