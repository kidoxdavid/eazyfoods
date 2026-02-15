# Create Your S3 Bucket – Step-by-Step

Follow these in order. Your bucket name and region are already in `.env`; you can create a new bucket with the same settings or adjust the name/region there after.

---

## Step 1: General configuration & Object Ownership

1. In AWS Console go to **S3** → **Create bucket**.

2. **Bucket name**  
   - Enter: `eazyfoods-bucket-storage` (or another name; if you change it, set `S3_BUCKET_NAME` in `.env` to match).

3. **AWS Region**  
   - Choose **US East (Ohio) us-east-2** (or any region you prefer; set `AWS_REGION` in `.env` to match, e.g. `us-east-2`).

4. **Bucket type**  
   - Leave **General purpose** selected.

5. **Object Ownership**  
   - Leave **ACLs disabled (recommended)** and **Bucket owner enforced** as shown.

6. Click **Next**.

---

## Step 2: Block Public Access & optional settings

1. **Block Public Access settings**  
   - **Uncheck** “Block all public access”.  
   - Confirm the warning (we need public read so the app can show images via direct S3 URLs).  
   - Leave the four sub-options as they are after you uncheck the main box.

2. **Bucket Versioning**  
   - Leave **Disable** (you can enable later if you want version history).

3. **Tags**  
   - Optional. You can skip or add tags (e.g. `Project = eazyfoods`).

4. Click **Next**.

---

## Step 3: Default encryption

1. **Encryption type**  
   - Leave **Server-side encryption with Amazon S3 managed keys (SSE-S3)** selected.

2. **Bucket Key**  
   - Leave as is (Enable or Disable is fine for SSE-S3).

3. **Advanced settings**  
   - Leave default (collapsed).

4. Click **Next**.

---

## Step 4: Review and create

1. Review the summary.  
2. Click **Create bucket**.

---

## Step 5: Bucket policy (so images are readable)

1. Open your new bucket **eazyfoods-bucket-storage**.
2. Go to the **Permissions** tab.
3. Under **Bucket policy**, click **Edit**.
4. Paste this (use your actual bucket name if different):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eazyfoods-bucket-storage/*"
    }
  ]
}
```

5. Click **Save changes**.

---

## Checklist

- [ ] Bucket name matches `S3_BUCKET_NAME` in `.env` (e.g. `eazyfoods-bucket-storage`).
- [ ] Region matches `AWS_REGION` in `.env` (e.g. `us-east-2`).
- [ ] “Block all public access” is **off** so images can load.
- [ ] Bucket policy added for `s3:GetObject` (public read on objects).
- [ ] IAM user has S3 access; access key and secret are in `.env` as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

After this, restart (or redeploy) your API and new uploads will go to S3 and images will load in the app.
