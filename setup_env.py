#!/usr/bin/env python3
"""
Script to help set up your .env file for Postgres app.
This will create/update your .env file with the correct settings.
"""

import os

def setup_env():
    """Create or update .env file with Postgres app settings."""
    
    print("Setting up .env file for Postgres app...")
    print("-" * 50)
    
    # Get macOS username
    username = os.getenv('USER', 'postgres')
    print(f"Detected macOS username: {username}")
    print("\nFor Postgres app, the username is usually:")
    print(f"  1. Your macOS username: {username}")
    print("  2. OR 'postgres'")
    
    # Ask user for their preference
    print("\nWhich username should we use?")
    print("  1. Use macOS username (recommended)")
    print("  2. Use 'postgres'")
    print("  3. Enter custom username")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == "1":
        db_user = username
    elif choice == "2":
        db_user = "postgres"
    else:
        db_user = input("Enter your PostgreSQL username: ").strip()
    
    # Ask about password
    print("\nFor local Postgres app, password is often empty.")
    has_password = input("Do you have a password set? (y/n): ").strip().lower()
    
    if has_password == 'y':
        db_password = input("Enter your PostgreSQL password: ").strip()
    else:
        db_password = ""
    
    # Create .env content
    env_content = f"""# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyfoods
DB_USER={db_user}
DB_PASSWORD={db_password}

# Application Configuration
SECRET_KEY=your_secret_key_here_change_this
DEBUG=True
"""
    
    # Write to .env file
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print("\n" + "=" * 50)
    print("✓ .env file created/updated successfully!")
    print("=" * 50)
    print(f"\nConfiguration saved:")
    print(f"  DB_USER: {db_user}")
    print(f"  DB_PASSWORD: {'(empty)' if not db_password else '***'}")
    print(f"\nFile location: {env_path}")
    print("\nNext steps:")
    print("  1. Run: python3 create_database.py")
    print("  2. Run: python3 test_db_connection.py")

if __name__ == "__main__":
    setup_env()

