"""
Example: Pandas Integration with Fabric Lakehouse
==================================================
Demonstrates how to work with Fabric data using pandas.

This example shows:
- Reading data from SQL endpoint into pandas DataFrame
- Processing data with pandas
- Uploading results back to lakehouse
"""

import sys
from pathlib import Path
import pandas as pd
import io

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from connectors.sql_connector import SQLConnector
from connectors.onelake_connector import OneLakeConnector


def read_table_to_dataframe(table_name: str) -> pd.DataFrame:
    """Read a Delta table into a pandas DataFrame using SQL."""
    with SQLConnector(use_interactive=True) as connector:
        return connector.query(f"SELECT * FROM [{table_name}]")


def upload_dataframe_to_lakehouse(df: pd.DataFrame, remote_path: str, format: str = "csv"):
    """Upload a pandas DataFrame to lakehouse Files folder."""
    connector = OneLakeConnector(use_interactive=True)

    # Convert DataFrame to bytes
    if format == "csv":
        buffer = io.BytesIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)
    elif format == "parquet":
        buffer = io.BytesIO()
        df.to_parquet(buffer, index=False)
        buffer.seek(0)
    else:
        raise ValueError(f"Unsupported format: {format}")

    # Write to temporary file and upload
    temp_path = f"temp_upload.{format}"
    with open(temp_path, "wb") as f:
        f.write(buffer.read())

    connector.upload_file(temp_path, remote_path)

    # Clean up temp file
    Path(temp_path).unlink()


def main():
    print("Pandas Integration Example")
    print("=" * 50)

    # Example: Read data from lakehouse
    print("\n1. Reading data from SQL endpoint...")
    # Uncomment and modify for your table:
    # df = read_table_to_dataframe("my_table")
    # print(df.head())

    # Example: Create sample data
    print("\n2. Creating sample DataFrame...")
    sample_df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
        "value": [100, 200, 150, 300, 250]
    })
    print(sample_df)

    # Example: Upload to lakehouse
    print("\n3. Uploading DataFrame to lakehouse...")
    # Uncomment to upload:
    # upload_dataframe_to_lakehouse(sample_df, "uploads/sample_data.csv", format="csv")
    # upload_dataframe_to_lakehouse(sample_df, "uploads/sample_data.parquet", format="parquet")
    print("   (Uncomment upload lines in code to test)")

    # Example: Query and aggregate
    print("\n4. Query with aggregation...")
    # Uncomment for your data:
    # with SQLConnector(use_interactive=True) as connector:
    #     df = connector.query("""
    #         SELECT
    #             category,
    #             COUNT(*) as count,
    #             SUM(amount) as total_amount,
    #             AVG(amount) as avg_amount
    #         FROM sales_data
    #         GROUP BY category
    #         ORDER BY total_amount DESC
    #     """)
    #     print(df)


if __name__ == "__main__":
    main()
