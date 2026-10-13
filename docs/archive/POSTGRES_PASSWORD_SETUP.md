# Setting Up Postgres App Password

Your Postgres app requires a password. Here's how to set it up:

## Option 1: Set a Password via Postgres App (Recommended)

### Steps:
1. **Open the Postgres app**
2. **Right-click on your server** (or click the server name)
3. Look for options like:
   - "Open psql" or "Open Terminal"
   - "Initialize" or "Settings"
   - "Change Password"

### If you can open psql:
Once you're in the psql terminal, run:
```sql
ALTER USER davidebubeihezue WITH PASSWORD 'your_password_here';
```
Or if using postgres user:
```sql
ALTER USER postgres WITH PASSWORD 'your_password_here';
```

## Option 2: Set Password via Terminal (if psql is available)

If the Postgres app has psql in the PATH, you can run:

```bash
# For your macOS username
psql -U davidebubeihezue -d postgres -c "ALTER USER davidebubeihezue WITH PASSWORD 'your_password';"

# OR for postgres user
psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'your_password';"
```

## Option 3: Find the Password in Postgres App

1. Check the Postgres app settings/preferences
2. Look for "Connection" or "Authentication" settings
3. Some Postgres apps store the password in keychain

## Option 4: Reset and Use a Simple Password

If you can access the Postgres app terminal, set a simple password:

```sql
ALTER USER davidebubeihezue WITH PASSWORD 'postgres';
```

Then update your `.env` file:
```
DB_USER=davidebubeihezue
DB_PASSWORD=postgres
```

## After Setting Password

1. Update your `.env` file with the password:
   ```
   DB_PASSWORD=your_actual_password
   ```

2. Test the connection:
   ```bash
   python3 test_db_connection.py
   ```

3. Create the database:
   ```bash
   python3 create_database.py
   ```

## Quick Test

After setting a password, you can test it quickly by updating `.env` and running:
```bash
python3 test_db_connection.py
```

