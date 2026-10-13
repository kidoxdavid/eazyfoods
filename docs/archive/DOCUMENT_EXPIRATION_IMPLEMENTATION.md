# Document Expiration Implementation Plan

## Overview

- **2 weeks before expiration**: Notify admin and driver/vendor/chef
- **On expiration**: Auto-deactivate driver/vendor/chef
- **Resubmit flow**: Deactivated users can resubmit documents from their existing account

## Backend Changes Needed

### 1. Document validity check (driver_portal, chef_portal, vendor auth)

- On driver/chef/vendor login or `/me`:
  - Check `driver_license_validity`, `vehicle_registration_validity`, `insurance_validity` (driver)
  - Check `government_id_validity`, `chef_certification_validity` (chef) – *add these columns if missing*
  - Check `government_id_validity`, `business_registration_validity` (vendor) – *add these columns if missing*
- If any document is past expiry: set `is_active = False`
- If any document expires within 14 days: return `document_expiring_soon: true` and list of docs

### 2. Add validity columns

- **Chef**: `government_id_validity`, `chef_certification_validity` (TIMESTAMP)
- **Vendor**: `government_id_validity`, `business_registration_validity` (TIMESTAMP)
- **Driver**: Already has `driver_license_validity`, `vehicle_registration_validity`, `insurance_validity`

### 3. Admin notifications

- Add endpoint or cron that finds drivers/vendors/chefs with documents expiring within 14 days
- Store in `platform_settings` or a `notifications` table
- Admin dashboard shows "Documents expiring soon" banner

### 4. Resubmit flow

- Driver/chef/vendor profile page: if `is_active === false` and reason is document expiry, show "Resubmit Documents" button
- Re-use existing upload endpoints (`/uploads/driver-documents`, etc.)
- After resubmit, set `verification_status = 'pending'` and `is_active = false` until admin re-approves

## Migration

Run migrations to add validity columns for chef and vendor if they do not exist.

## Cron / Scheduled task (optional)

For production, run a daily job that:
1. Finds all drivers/vendors/chefs with documents expiring in ≤14 days
2. Sends email/in-app notifications
3. Finds all with expired documents and sets `is_active = False`

Alternatively, the check can be done on each login/`/me` call (simpler, no cron needed).
