"""
Example: Fabric REST API Access
===============================
Demonstrates how to use the Fabric REST API.

Before running:
1. Update ../config/fabric_config.py with your workspace/lakehouse IDs
2. Run 'az login' to authenticate
"""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from connectors.fabric_api_connector import FabricAPIConnector


def main():
    print("Fabric REST API Access Example")
    print("=" * 50)

    # Initialize connector (will prompt for login if needed)
    connector = FabricAPIConnector(use_interactive=True)

    # List workspaces
    print("\n1. Listing workspaces...")
    workspaces = connector.list_workspaces()
    for ws in workspaces[:5]:  # First 5
        print(f"   [WORKSPACE] {ws.get('displayName')}")
        print(f"               ID: {ws.get('id')}")

    # List lakehouses
    print("\n2. Listing lakehouses in default workspace...")
    lakehouses = connector.list_lakehouses()
    for lh in lakehouses:
        print(f"   [LAKEHOUSE] {lh.get('displayName')}")
        print(f"               ID: {lh.get('id')}")

    # List tables
    print("\n3. Listing tables in default lakehouse...")
    tables = connector.list_tables()
    for t in tables:
        print(f"   [TABLE] {t.get('name')} ({t.get('type', 'unknown')})")

    # List notebooks
    print("\n4. Listing notebooks...")
    notebooks = connector.list_notebooks()
    for nb in notebooks[:5]:  # First 5
        print(f"   [NOTEBOOK] {nb.get('displayName')}")

    # List pipelines
    print("\n5. Listing data pipelines...")
    pipelines = connector.list_pipelines()
    for p in pipelines[:5]:  # First 5
        print(f"   [PIPELINE] {p.get('displayName')}")

    # Example: Load data into table
    # print("\n6. Loading data into table...")
    # connector.load_table(
    #     table_name="my_new_table",
    #     relative_path="data/myfile.parquet",
    #     file_format="Parquet",
    #     mode="Overwrite"
    # )


if __name__ == "__main__":
    main()
