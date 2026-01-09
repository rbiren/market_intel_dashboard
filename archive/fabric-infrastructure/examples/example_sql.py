"""
Example: SQL Endpoint Access
============================
Demonstrates how to query Fabric Lakehouse via SQL Endpoint.

Before running:
1. Update ../config/fabric_config.py with your SQL endpoint details
2. Install ODBC Driver 18 for SQL Server
3. Run 'az login' to authenticate
"""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from connectors.sql_connector import SQLConnector


def main():
    print("SQL Endpoint Access Example")
    print("=" * 50)

    # Initialize connector (will prompt for login if needed)
    with SQLConnector(use_interactive=True) as connector:

        # List all tables
        print("\n1. Listing tables...")
        tables = connector.list_tables()
        for t in tables:
            print(f"   [TABLE] {t}")

        if not tables:
            print("   No tables found. Create some Delta tables first.")
            return

        # Get schema for first table
        first_table = tables[0]
        print(f"\n2. Schema for '{first_table}'...")
        schema = connector.get_table_schema(first_table)
        print(schema.to_string(index=False))

        # Get row count
        print(f"\n3. Row count for '{first_table}'...")
        count = connector.get_row_count(first_table)
        print(f"   {count:,} rows")

        # Preview data
        print(f"\n4. Preview data from '{first_table}'...")
        df = connector.preview_table(first_table, rows=5)
        print(df.to_string())

        # Custom query example
        print("\n5. Custom query example...")
        # Uncomment and modify for your tables:
        # df = connector.query("""
        #     SELECT column1, column2, COUNT(*) as cnt
        #     FROM my_table
        #     GROUP BY column1, column2
        #     ORDER BY cnt DESC
        # """)
        # print(df)


if __name__ == "__main__":
    main()
