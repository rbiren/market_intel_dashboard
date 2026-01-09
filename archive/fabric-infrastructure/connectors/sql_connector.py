"""
SQL Endpoint Connector
======================
Access Microsoft Fabric Lakehouse data via SQL Endpoint.

This allows you to query Delta tables using standard SQL syntax.
Requires: ODBC Driver 18 for SQL Server

Authentication:
- Interactive: Uses Azure AD authentication via browser
- Service Principal: Set environment variables
"""

import os
import sys
from pathlib import Path
from typing import List, Optional, Any
import struct

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

import pyodbc
import pandas as pd
from azure.identity import DefaultAzureCredential, InteractiveBrowserCredential

from config.fabric_config import (
    SQL_ENDPOINT_SERVER,
    SQL_DATABASE_NAME,
)


class SQLConnector:
    """
    Connector for querying Fabric Lakehouse via SQL Endpoint.

    Usage:
        connector = SQLConnector()

        # Run a query
        df = connector.query("SELECT * FROM my_table LIMIT 10")

        # List all tables
        tables = connector.list_tables()

        # Get table schema
        schema = connector.get_table_schema("my_table")
    """

    def __init__(
        self,
        server: str = None,
        database: str = None,
        use_interactive: bool = True
    ):
        """
        Initialize SQL connector.

        Args:
            server: SQL endpoint server (uses config default if not provided)
            database: Database/lakehouse name (uses config default if not provided)
            use_interactive: If True, use browser-based interactive login
        """
        self.server = server or SQL_ENDPOINT_SERVER
        self.database = database or SQL_DATABASE_NAME
        self.use_interactive = use_interactive
        self._connection = None

    def _get_access_token(self) -> str:
        """Get Azure AD access token for SQL authentication."""
        if self.use_interactive:
            credential = InteractiveBrowserCredential()
        else:
            credential = DefaultAzureCredential()

        # Get token for Azure SQL Database resource
        token = credential.get_token("https://database.windows.net/.default")
        return token.token

    def _get_connection_string(self) -> str:
        """Build ODBC connection string."""
        return (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={self.server};"
            f"Database={self.database};"
            f"Encrypt=yes;"
            f"TrustServerCertificate=no;"
        )

    def _get_token_struct(self, token: str) -> bytes:
        """Convert access token to struct for ODBC."""
        token_bytes = token.encode("utf-16-le")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
        return token_struct

    def connect(self) -> pyodbc.Connection:
        """
        Establish connection to SQL endpoint.

        Returns:
            pyodbc Connection object
        """
        if self._connection:
            return self._connection

        try:
            # Get access token
            token = self._get_access_token()
            token_struct = self._get_token_struct(token)

            # Connect with token
            connection_string = self._get_connection_string()
            self._connection = pyodbc.connect(
                connection_string,
                attrs_before={1256: token_struct}  # SQL_COPT_SS_ACCESS_TOKEN
            )

            print(f"Connected to: {self.server}/{self.database}")
            return self._connection

        except Exception as e:
            print(f"Connection error: {e}")
            raise

    def disconnect(self):
        """Close the connection."""
        if self._connection:
            self._connection.close()
            self._connection = None
            print("Disconnected")

    def query(self, sql: str) -> pd.DataFrame:
        """
        Execute a SQL query and return results as DataFrame.

        Args:
            sql: SQL query string

        Returns:
            pandas DataFrame with results
        """
        conn = self.connect()

        try:
            df = pd.read_sql(sql, conn)
            return df
        except Exception as e:
            print(f"Query error: {e}")
            raise

    def execute(self, sql: str) -> int:
        """
        Execute a SQL statement (INSERT, UPDATE, DELETE, etc.)

        Args:
            sql: SQL statement

        Returns:
            Number of rows affected
        """
        conn = self.connect()

        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            rows_affected = cursor.rowcount
            conn.commit()
            return rows_affected
        except Exception as e:
            print(f"Execute error: {e}")
            raise

    def list_tables(self) -> List[str]:
        """
        List all tables in the lakehouse.

        Returns:
            List of table names
        """
        sql = """
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
        """

        df = self.query(sql)
        return df["TABLE_NAME"].tolist()

    def list_views(self) -> List[str]:
        """
        List all views in the lakehouse.

        Returns:
            List of view names
        """
        sql = """
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.VIEWS
        ORDER BY TABLE_NAME
        """

        df = self.query(sql)
        return df["TABLE_NAME"].tolist()

    def get_table_schema(self, table_name: str) -> pd.DataFrame:
        """
        Get schema information for a table.

        Args:
            table_name: Name of the table

        Returns:
            DataFrame with column information
        """
        sql = f"""
        SELECT
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE,
            IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
        """

        return self.query(sql)

    def get_row_count(self, table_name: str) -> int:
        """
        Get the number of rows in a table.

        Args:
            table_name: Name of the table

        Returns:
            Row count
        """
        sql = f"SELECT COUNT(*) as count FROM [{table_name}]"
        df = self.query(sql)
        return df["count"].iloc[0]

    def preview_table(self, table_name: str, rows: int = 10) -> pd.DataFrame:
        """
        Preview data from a table.

        Args:
            table_name: Name of the table
            rows: Number of rows to return

        Returns:
            DataFrame with table data
        """
        sql = f"SELECT TOP {rows} * FROM [{table_name}]"
        return self.query(sql)

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def quick_query(sql: str, server: str = None, database: str = None) -> pd.DataFrame:
    """Quick helper to run a query."""
    with SQLConnector(server, database) as connector:
        return connector.query(sql)


def quick_list_tables(server: str = None, database: str = None) -> List[str]:
    """Quick helper to list tables."""
    with SQLConnector(server, database) as connector:
        return connector.list_tables()


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    print("SQL Endpoint Connector - Test Connection")
    print("=" * 50)

    try:
        with SQLConnector(use_interactive=True) as connector:

            print("\nListing tables...")
            tables = connector.list_tables()

            if tables:
                for t in tables:
                    print(f"  [TABLE] {t}")

                # Preview first table
                if tables:
                    first_table = tables[0]
                    print(f"\nPreviewing '{first_table}'...")
                    df = connector.preview_table(first_table, rows=5)
                    print(df.to_string())
            else:
                print("  (No tables found)")

    except Exception as e:
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("1. Install ODBC Driver 18 for SQL Server")
        print("2. Update config/fabric_config.py with your SQL endpoint details")
        print("3. Ensure you have access to the Fabric workspace")
