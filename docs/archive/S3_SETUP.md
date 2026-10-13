# S3 Setup Guide

Uploads can be stored in AWS S3 instead of local disk. When configured, all product, ad, recipe, and chef images go to S3 and persist across deploys/restarts.

## 1. Create an S3 Bucket

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to **S3** → **Create bucket**
3. Choose a unique bucket name (e.g. `eazyfoods-uploads`)
4. Pick a region (e.g. `us-east-1`)
5. Uncheck **Block all public access** (or add a bucket policy for public read)
6. Create the bucket

## 2. Set Bucket Policy (public read)

In the bucket → **Permissions** → **Bucket policy**, add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

Replace `YOUR_BUCKET_NAME` with your bucket name.

## 3. Create IAM User for Uploads

1. Go to **IAM** → **Users** → **Create user**
2. Name it (e.g. `eazyfoods-uploads`)
3. Attach policy: **AmazonS3FullAccess** (or a custom policy that allows `s3:PutObject` and `s3:GetObject` on your bucket only)
4. Create **Access key** → choose **Application running outside AWS** → copy **Access key ID** and **Secret access key**

## 4. Add Environment Variables

On Render (or in `.env` locally):

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=eazyfoods-uploads
```

**Optional** – custom domain/CDN base URL:

```
S3_PUBLIC_URL=https://uploads.eazyfoods.ca
```

If not set, URLs use `https://{bucket}.s3.{region}.amazonaws.com/{key}`.

## 5. Deploy

After setting the env vars, redeploy. New uploads will go to S3. Existing records pointing to `/api/v1/uploads/...` will still 404 on ephemeral disk; only new uploads will work.
