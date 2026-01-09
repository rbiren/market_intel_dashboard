"""
Fabric REST API Connector
=========================
Access Microsoft Fabric resources via REST API.

This provides programmatic access to:
- Workspaces
- Lakehouses
- Tables (load, list, run maintenance)
- Notebooks
- Data pipelines
- And more...

Authentication:
- Interactive: Uses Azure AD authentication via browser
- Service Principal: Set environment variables
"""

import os
import sys
import ssl
import urllib3
from pathlib import Path
from typing import List, Optional, Dict, Any
import json

# Disable SSL warnings and verification
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
os.environ['AZURE_CLI_DISABLE_CONNECTION_VERIFICATION'] = '1'
ssl._create_default_https_context = ssl._create_unverified_context

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
from azure.identity import DefaultAzureCredential, InteractiveBrowserCredential

from config.fabric_config import (
    WORKSPACE_ID,
    LAKEHOUSE_ID,
    WORKSPACE_NAME,
    LAKEHOUSE_NAME,
)


class FabricAPIConnector:
    """
    Connector for Microsoft Fabric REST API.

    Usage:
        connector = FabricAPIConnector()

        # List workspaces
        workspaces = connector.list_workspaces()

        # List lakehouses in a workspace
        lakehouses = connector.list_lakehouses()

        # List tables in a lakehouse
        tables = connector.list_tables()

        # Load data into a table
        connector.load_table("my_table", "Files/data.parquet")
    """

    BASE_URL = "https://api.fabric.microsoft.com/v1"

    def __init__(
        self,
        workspace_id: str = None,
        lakehouse_id: str = None,
        use_interactive: bool = True
    ):
        """
        Initialize Fabric API connector.

        Args:
            workspace_id: Fabric workspace ID (uses config default if not provided)
            lakehouse_id: Lakehouse ID (uses config default if not provided)
            use_interactive: If True, use browser-based interactive login
        """
        self.workspace_id = workspace_id or WORKSPACE_ID
        self.lakehouse_id = lakehouse_id or LAKEHOUSE_ID
        self.use_interactive = use_interactive
        self._token = None

    def _get_access_token(self) -> str:
        """Get Azure AD access token for Fabric API."""
        if self._token:
            return self._token

        if self.use_interactive:
            credential = InteractiveBrowserCredential()
        else:
            credential = DefaultAzureCredential()

        # Get token for Fabric API resource
        token = credential.get_token("https://api.fabric.microsoft.com/.default")
        self._token = token.token
        return self._token

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authentication."""
        token = self._get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make an API request."""
        url = f"{self.BASE_URL}{endpoint}"
        headers = self._get_headers()

        response = requests.request(method, url, headers=headers, json=data, verify=False)

        if response.status_code >= 400:
            print(f"API Error: {response.status_code}")
            print(response.text)
            response.raise_for_status()

        if response.text:
            return response.json()
        return {}

    # =========================================================================
    # WORKSPACE OPERATIONS
    # =========================================================================

    def list_workspaces(self) -> List[dict]:
        """
        List all accessible workspaces.

        Returns:
            List of workspace objects
        """
        result = self._request("GET", "/workspaces")
        return result.get("value", [])

    def get_workspace(self, workspace_id: str = None) -> dict:
        """
        Get workspace details.

        Args:
            workspace_id: Workspace ID (uses default if not provided)

        Returns:
            Workspace object
        """
        wid = workspace_id or self.workspace_id
        return self._request("GET", f"/workspaces/{wid}")

    # =========================================================================
    # LAKEHOUSE OPERATIONS
    # =========================================================================

    def list_lakehouses(self, workspace_id: str = None) -> List[dict]:
        """
        List lakehouses in a workspace.

        Args:
            workspace_id: Workspace ID (uses default if not provided)

        Returns:
            List of lakehouse objects
        """
        wid = workspace_id or self.workspace_id
        result = self._request("GET", f"/workspaces/{wid}/lakehouses")
        return result.get("value", [])

    def get_lakehouse(self, workspace_id: str = None, lakehouse_id: str = None) -> dict:
        """
        Get lakehouse details.

        Args:
            workspace_id: Workspace ID (uses default if not provided)
            lakehouse_id: Lakehouse ID (uses default if not provided)

        Returns:
            Lakehouse object
        """
        wid = workspace_id or self.workspace_id
        lid = lakehouse_id or self.lakehouse_id
        return self._request("GET", f"/workspaces/{wid}/lakehouses/{lid}")

    # =========================================================================
    # TABLE OPERATIONS
    # =========================================================================

    def list_tables(self, workspace_id: str = None, lakehouse_id: str = None) -> List[dict]:
        """
        List tables in a lakehouse.

        Args:
            workspace_id: Workspace ID (uses default if not provided)
            lakehouse_id: Lakehouse ID (uses default if not provided)

        Returns:
            List of table objects
        """
        wid = workspace_id or self.workspace_id
        lid = lakehouse_id or self.lakehouse_id
        result = self._request("GET", f"/workspaces/{wid}/lakehouses/{lid}/tables")
        return result.get("data", [])

    def load_table(
        self,
        table_name: str,
        relative_path: str,
        file_format: str = "Parquet",
        mode: str = "Overwrite",
        workspace_id: str = None,
        lakehouse_id: str = None
    ) -> dict:
        """
        Load data from Files folder into a Delta table.

        Args:
            table_name: Name of the target table
            relative_path: Path relative to Files folder (e.g., "data/myfile.parquet")
            file_format: Source file format (Parquet, Csv, etc.)
            mode: Load mode (Overwrite, Append)
            workspace_id: Workspace ID (uses default if not provided)
            lakehouse_id: Lakehouse ID (uses default if not provided)

        Returns:
            API response
        """
        wid = workspace_id or self.workspace_id
        lid = lakehouse_id or self.lakehouse_id

        data = {
            "relativePath": relative_path,
            "pathType": "File",
            "mode": mode,
            "formatOptions": {
                "format": file_format
            }
        }

        return self._request(
            "POST",
            f"/workspaces/{wid}/lakehouses/{lid}/tables/{table_name}/load",
            data
        )

    def run_table_maintenance(
        self,
        table_name: str,
        operation: str = "Optimize",
        workspace_id: str = None,
        lakehouse_id: str = None
    ) -> dict:
        """
        Run maintenance on a Delta table.

        Args:
            table_name: Name of the table
            operation: Maintenance operation (Optimize, Vacuum)
            workspace_id: Workspace ID (uses default if not provided)
            lakehouse_id: Lakehouse ID (uses default if not provided)

        Returns:
            API response
        """
        wid = workspace_id or self.workspace_id
        lid = lakehouse_id or self.lakehouse_id

        data = {
            "executionData": {
                "tableName": table_name,
                "optimizeSettings": {
                    "vOrder": True,
                    "zOrderBy": []
                }
            }
        }

        return self._request(
            "POST",
            f"/workspaces/{wid}/lakehouses/{lid}/jobs/instances?jobType=TableMaintenance",
            data
        )

    # =========================================================================
    # NOTEBOOK OPERATIONS
    # =========================================================================

    def list_notebooks(self, workspace_id: str = None) -> List[dict]:
        """
        List notebooks in a workspace.

        Args:
            workspace_id: Workspace ID (uses default if not provided)

        Returns:
            List of notebook objects
        """
        wid = workspace_id or self.workspace_id
        result = self._request("GET", f"/workspaces/{wid}/notebooks")
        return result.get("value", [])

    # =========================================================================
    # DATA PIPELINE OPERATIONS
    # =========================================================================

    def list_pipelines(self, workspace_id: str = None) -> List[dict]:
        """
        List data pipelines in a workspace.

        Args:
            workspace_id: Workspace ID (uses default if not provided)

        Returns:
            List of pipeline objects
        """
        wid = workspace_id or self.workspace_id
        result = self._request("GET", f"/workspaces/{wid}/dataPipelines")
        return result.get("value", [])

    def run_pipeline(
        self,
        pipeline_id: str,
        workspace_id: str = None,
        parameters: dict = None
    ) -> dict:
        """
        Run a data pipeline.

        Args:
            pipeline_id: Pipeline ID
            workspace_id: Workspace ID (uses default if not provided)
            parameters: Optional pipeline parameters

        Returns:
            API response with job ID
        """
        wid = workspace_id or self.workspace_id

        data = {}
        if parameters:
            data["parameters"] = parameters

        return self._request(
            "POST",
            f"/workspaces/{wid}/items/{pipeline_id}/jobs/instances?jobType=Pipeline",
            data
        )

    # =========================================================================
    # ITEM OPERATIONS (Generic)
    # =========================================================================

    def list_items(self, workspace_id: str = None, item_type: str = None) -> List[dict]:
        """
        List items in a workspace.

        Args:
            workspace_id: Workspace ID (uses default if not provided)
            item_type: Filter by item type (Lakehouse, Notebook, etc.)

        Returns:
            List of items
        """
        wid = workspace_id or self.workspace_id
        endpoint = f"/workspaces/{wid}/items"

        if item_type:
            endpoint += f"?type={item_type}"

        result = self._request("GET", endpoint)
        return result.get("value", [])


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_connector(workspace_id: str = None, lakehouse_id: str = None) -> FabricAPIConnector:
    """Get a configured Fabric API connector instance."""
    return FabricAPIConnector(workspace_id, lakehouse_id)


def quick_list_tables() -> List[dict]:
    """Quick helper to list tables."""
    connector = FabricAPIConnector()
    return connector.list_tables()


def quick_list_workspaces() -> List[dict]:
    """Quick helper to list workspaces."""
    connector = FabricAPIConnector()
    return connector.list_workspaces()


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    print("Fabric REST API Connector - Test Connection")
    print("=" * 50)

    try:
        connector = FabricAPIConnector(use_interactive=True)

        print("\nListing workspaces...")
        workspaces = connector.list_workspaces()

        if workspaces:
            for ws in workspaces[:5]:  # Show first 5
                print(f"  [WORKSPACE] {ws.get('displayName')} (ID: {ws.get('id')})")

        print("\nListing lakehouses...")
        lakehouses = connector.list_lakehouses()

        if lakehouses:
            for lh in lakehouses:
                print(f"  [LAKEHOUSE] {lh.get('displayName')} (ID: {lh.get('id')})")

        print("\nListing tables...")
        tables = connector.list_tables()

        if tables:
            for t in tables:
                print(f"  [TABLE] {t.get('name')} ({t.get('type')})")
        else:
            print("  (No tables found)")

    except Exception as e:
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("1. Update config/fabric_config.py with your workspace/lakehouse IDs")
        print("2. Ensure you have access to the Fabric workspace")
        print("3. Check that your Azure AD account has Fabric API permissions")
