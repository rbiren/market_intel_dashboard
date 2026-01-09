"""
Example: OneLake File Access
============================
Demonstrates how to access files in Fabric Lakehouse via OneLake.

Before running:
1. Update ../config/fabric_config.py with your workspace/lakehouse details
2. Run 'az login' to authenticate
"""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from connectors.onelake_connector import OneLakeConnector


def main():
    print("OneLake File Access Example")
    print("=" * 50)

    # Initialize connector (will prompt for login if needed)
    connector = OneLakeConnector(use_interactive=True)

    # List files in root of Files folder
    print("\n1. Listing files in root folder...")
    files = connector.list_files()
    for f in files:
        file_type = "DIR " if f["is_directory"] else "FILE"
        size = f["size"] or 0
        print(f"   [{file_type}] {f['name']} ({size:,} bytes)")

    # List Delta tables
    print("\n2. Listing Delta tables...")
    tables = connector.list_tables()
    for t in tables:
        print(f"   [TABLE] {t}")

    # Example: Upload a file
    # print("\n3. Uploading a test file...")
    # connector.upload_file("local_file.csv", "uploads/test.csv")

    # Example: Download a file
    # print("\n4. Downloading a file...")
    # connector.download_file("data/sample.csv", "downloaded_sample.csv")

    # Example: Read file content directly
    # print("\n5. Reading file content...")
    # content = connector.read_file("data/sample.csv")
    # print(content[:500])  # First 500 chars


if __name__ == "__main__":
    main()
