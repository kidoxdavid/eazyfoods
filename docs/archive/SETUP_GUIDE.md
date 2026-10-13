# Postgres App Setup Guide

## Step-by-Step Instructions

### 1. Open the Postgres App
- Open the **Postgres** app from your Applications folder
- You should see a PostgreSQL server listed (e.g., "PostgreSQL 14" or "PostgreSQL 15")

### 2. Start the Server (if needed)
- If the server shows as "Stopped", click the **Start** button
- Wait until it shows "Running" (green indicator)

### 3. Find Your Connection Details
In the Postgres app, look for:
- **Port**: Usually `5432` (default)
- **Username**: This is typically:
  - Your macOS username (e.g., `davidebubeihezue`)
  - OR `postgres` (if you set it up that way)
- **Password**: 
  - Often **empty/blank** for local Postgres app installations
  - OR the password you set during installation

### 4. Configure Your .env File
Edit the `.env` file in this project with your Postgres app details:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyfoods
DB_USER=your_username_here    # Replace with your actual username
DB_PASSWORD=                   # Leave empty if no password, or enter your password
```

**Common scenarios:**
- **If username is your macOS username**: `DB_USER=davidebubeihezue` and `DB_PASSWORD=` (empty)
- **If username is postgres**: `DB_USER=postgres` and `DB_PASSWORD=your_password`

### 5. Create the Database
Run this command to create the `easyfoods` database:

```bash
python3 create_database.py
```

This will:
- Connect to your PostgreSQL server
- Create the `easyfoods` database if it doesn't exist

### 6. Test the Connection
Test your database connection:

```bash
python3 test_db_connection.py
```

You should see:
- ✓ Connection successful
- ✓ PostgreSQL version
- ✓ Connected to database: easyfoods

### 7. Set Up the Schema
Once the connection works, create all the tables:

```bash
python3 setup_database.py
```

## Troubleshooting

### "Connection refused" or "could not connect"
- **Solution**: Make sure the Postgres app is running (green indicator)

### "Password authentication failed"
- **Solution**: 
  - Try leaving `DB_PASSWORD=` empty in your `.env` file
  - OR check if you set a password in the Postgres app settings

### "Database does not exist"
- **Solution**: Run `python3 create_database.py` first

### "Role/user does not exist"
- **Solution**: 
  - Check the username in your Postgres app
  - Try using your macOS username instead of "postgres"
  - OR try "postgres" if you're using that

### Finding Your Username
If you're not sure what username to use:
1. In the Postgres app, look for any database tools or "Open psql" option
2. OR try both: your macOS username and "postgres"
3. The connection test will tell you which one works

## Quick Reference

**Default Postgres App Settings:**
- Host: `localhost`
- Port: `5432`
- Username: Usually your macOS username or `postgres`
- Password: Often empty for local development
- Database: `easyfoods` (we'll create this)

## Next Steps After Setup

Once your database is set up:
1. ✅ Connection test passes
2. ✅ Database created
3. ✅ Schema tables created
4. Ready to build your African grocery store website!

