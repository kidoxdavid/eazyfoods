"""
Script to create marketing tables
"""
import sys
sys.path.insert(0, '.')
from app.core.database import engine
from sqlalchemy import text

print('Creating marketing tables...')

with engine.begin() as conn:
    try:
        # Read SQL file
        with open('migrations/create_marketing_tables.sql', 'r') as f:
            sql = f.read()
        
        # Split into table creation and index creation
        all_statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
        table_statements = [s for s in all_statements if s.upper().startswith('CREATE TABLE')]
        index_statements = [s for s in all_statements if s.upper().startswith('CREATE INDEX')]
        
        # Create tables first
        print('\nCreating tables...')
        for stmt in table_statements:
            if stmt:
                try:
                    conn.execute(text(stmt))
                    table_name = stmt.split('(')[0].replace('CREATE TABLE IF NOT EXISTS', '').strip()
                    print(f'✓ Created table: {table_name}')
                except Exception as e:
                    if 'already exists' not in str(e).lower():
                        print(f'✗ Error creating table: {e}')
        
        # Then create indexes
        print('\nCreating indexes...')
        for stmt in index_statements:
            if stmt:
                try:
                    conn.execute(text(stmt))
                    index_name = stmt.split('ON')[0].replace('CREATE INDEX IF NOT EXISTS', '').strip()
                    print(f'✓ Created index: {index_name}')
                except Exception as e:
                    if 'already exists' not in str(e).lower():
                        print(f'✗ Error creating index: {e}')
        
        print('\n✓ Marketing tables created successfully!')
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

