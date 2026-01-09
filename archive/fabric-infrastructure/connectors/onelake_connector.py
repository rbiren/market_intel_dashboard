"""
OneLake File Access Connector
=============================
Access files and folders in Microsoft Fabric Lakehouse via OneLake (Azure Storage SDK).

This uses the same APIs as Azure Data Lake Storage Gen2.
Supports: upload, download, list, delete files and directories.

Authentication:
- Interactive: Run `az login` before using
- Service Principal: Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET env vars
"""

import os
import sys
import ssl
import urllib3
from pathlib import Path
from typing import List, Optional, Generator

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

from azure.identity import DefaultAzureCredential, InteractiveBrowserCredential
from azure.storage.filedatalake import DataLakeServiceClient, FileSystemClient, DataLakeDirectoryClient

# Disable SSL verification globally for this module
os.environ['AZURE_CLI_DISABLE_CONNECTION_VERIFICATION'] = '1'
ssl._create_default_https_context = ssl._create_unverified_context
from config.fabric_config import (
    ONELAKE_ACCOUNT_NAME,
    ONELAKE_DFS_ENDPOINT,
    WORKSPACE_NAME,
    LAKEHOUSE_NAME,
)


class OneLakeConnector:
    """
    Connector for accessing OneLake (Fabric Lakehouse) files.

    Usage:
        connector = OneLakeConnector()

        # List files
        files = connector.list_files("subfolder")

        # Upload file
        connector.upload_file("local_file.csv", "remote/path/file.csv")

        # Download file
        connector.download_file("remote/path/file.csv", "local_file.csv")

        # Read file content directly
        content = connector.read_file("remote/path/file.csv")
    """

    def __init__(self, workspace_name: str = None, lakehouse_name: str = None, use_interactive: bool = False):
        """
        Initialize OneLake connector.

        Args:
            workspace_name: Fabric workspace name (uses config default if not provided)
            lakehouse_name: Lakehouse name (uses config default if not provided)
            use_interactive: If True, use browser-based interactive login
        """
        self.workspace_name = workspace_name or WORKSPACE_NAME
        self.lakehouse_name = lakehouse_name or LAKEHOUSE_NAME
        self.account_url = ONELAKE_DFS_ENDPOINT

        # File system path in OneLake
        self.filesystem_name = f"{self.workspace_name}/{self.lakehouse_name}.Lakehouse"

        # Initialize credential
        if use_interactive:
            self.credential = InteractiveBrowserCredential()
        else:
            self.credential = DefaultAzureCredential()

        # Initialize service client
        self.service_client = DataLakeServiceClient(
            account_url=self.account_url,
            credential=self.credential
        )

        # Get filesystem client for the lakehouse
        self.filesystem_client = self.service_client.get_file_system_client(
            file_system=self.filesystem_name
        )

    def _get_files_path(self, relative_path: str = "") -> str:
        """Get full path within the Files folder."""
        return f"Files/{relative_path}".rstrip("/")

    def _get_tables_path(self, table_name: str = "") -> str:
        """Get full path within the Tables folder."""
        return f"Tables/{table_name}".rstrip("/")

    # =========================================================================
    # FILE OPERATIONS
    # =========================================================================

    def list_files(self, path: str = "", include_tables: bool = False) -> List[dict]:
        """
        List files and directories in the lakehouse.

        Args:
            path: Relative path within Files folder (empty for root)
            include_tables: If True, list from Tables folder instead

        Returns:
            List of dicts with file/directory info
        """
        full_path = self._get_tables_path(path) if include_tables else self._get_files_path(path)

        items = []
        try:
            paths = self.filesystem_client.get_paths(path=full_path)
            for item in paths:
                items.append({
                    "name": item.name,
                    "is_directory": item.is_directory,
                    "size": item.content_length,
                    "last_modified": item.last_modified,
                })
        except Exception as e:
            print(f"Error listing files: {e}")

        return items

    def list_tables(self) -> List[str]:
        """
        List all Delta tables in the lakehouse.

        Returns:
            List of table names
        """
        tables = []
        try:
            paths = self.filesystem_client.get_paths(path="Tables")
            for item in paths:
                if item.is_directory:
                    # Table name is the directory name
                    table_name = item.name.split("/")[-1]
                    tables.append(table_name)
        except Exception as e:
            print(f"Error listing tables: {e}")

        return tables

    def upload_file(self, local_path: str, remote_path: str, overwrite: bool = True) -> bool:
        """
        Upload a file to the lakehouse Files folder.

        Args:
            local_path: Path to local file
            remote_path: Destination path in Files folder
            overwrite: Whether to overwrite existing file

        Returns:
            True if successful
        """
        full_remote_path = self._get_files_path(remote_path)

        try:
            # Create directory client for parent folder
            parent_dir = "/".join(full_remote_path.split("/")[:-1])
            if parent_dir:
                dir_client = self.filesystem_client.get_directory_client(parent_dir)
                dir_client.create_directory()

            # Get file client and upload
            file_client = self.filesystem_client.get_file_client(full_remote_path)

            with open(local_path, "rb") as f:
                file_client.upload_data(f, overwrite=overwrite)

            print(f"Uploaded: {local_path} -> {remote_path}")
            return True

        except Exception as e:
            print(f"Error uploading file: {e}")
            return False

    def download_file(self, remote_path: str, local_path: str) -> bool:
        """
        Download a file from the lakehouse Files folder.

        Args:
            remote_path: Path in Files folder
            local_path: Local destination path

        Returns:
            True if successful
        """
        full_remote_path = self._get_files_path(remote_path)

        try:
            file_client = self.filesystem_client.get_file_client(full_remote_path)

            # Ensure local directory exists
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)

            with open(local_path, "wb") as f:
                download = file_client.download_file()
                download.readinto(f)

            print(f"Downloaded: {remote_path} -> {local_path}")
            return True

        except Exception as e:
            print(f"Error downloading file: {e}")
            return False

    def read_file(self, remote_path: str, encoding: str = "utf-8") -> Optional[str]:
        """
        Read file content directly from lakehouse.

        Args:
            remote_path: Path in Files folder
            encoding: Text encoding (default utf-8)

        Returns:
            File content as string, or None if error
        """
        full_remote_path = self._get_files_path(remote_path)

        try:
            file_client = self.filesystem_client.get_file_client(full_remote_path)
            download = file_client.download_file()
            content = download.readall()
            return content.decode(encoding)

        except Exception as e:
            print(f"Error reading file: {e}")
            return None

    def read_file_bytes(self, remote_path: str) -> Optional[bytes]:
        """
        Read file content as bytes from lakehouse.

        Args:
            remote_path: Path in Files folder

        Returns:
            File content as bytes, or None if error
        """
        full_remote_path = self._get_files_path(remote_path)

        try:
            file_client = self.filesystem_client.get_file_client(full_remote_path)
            download = file_client.download_file()
            return download.readall()

        except Exception as e:
            print(f"Error reading file: {e}")
            return None

    def delete_file(self, remote_path: str) -> bool:
        """
        Delete a file from the lakehouse.

        Args:
            remote_path: Path in Files folder

        Returns:
            True if successful
        """
        full_remote_path = self._get_files_path(remote_path)

        try:
            file_client = self.filesystem_client.get_file_client(full_remote_path)
            file_client.delete_file()
            print(f"Deleted: {remote_path}")
            return True

        except Exception as e:
            print(f"Error deleting file: {e}")
            return False

    def create_directory(self, path: str) -> bool:
        """
        Create a directory in the lakehouse Files folder.

        Args:
            path: Directory path in Files folder

        Returns:
            True if successful
        """
        full_path = self._get_files_path(path)

        try:
            dir_client = self.filesystem_client.get_directory_client(full_path)
            dir_client.create_directory()
            print(f"Created directory: {path}")
            return True

        except Exception as e:
            print(f"Error creating directory: {e}")
            return False


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_connector(workspace_name: str = None, lakehouse_name: str = None) -> OneLakeConnector:
    """Get a configured OneLake connector instance."""
    return OneLakeConnector(workspace_name, lakehouse_name)


def quick_list_files(path: str = "") -> List[dict]:
    """Quick helper to list files."""
    connector = OneLakeConnector()
    return connector.list_files(path)


def quick_upload(local_path: str, remote_path: str) -> bool:
    """Quick helper to upload a file."""
    connector = OneLakeConnector()
    return connector.upload_file(local_path, remote_path)


def quick_download(remote_path: str, local_path: str) -> bool:
    """Quick helper to download a file."""
    connector = OneLakeConnector()
    return connector.download_file(remote_path, local_path)


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    print("OneLake Connector - Test Connection")
    print("=" * 50)

    try:
        connector = OneLakeConnector(use_interactive=True)

        print("\nListing files in root of Files folder...")
        files = connector.list_files()

        if files:
            for f in files:
                file_type = "DIR " if f["is_directory"] else "FILE"
                print(f"  [{file_type}] {f['name']}")
        else:
            print("  (No files found or empty folder)")

        print("\nListing Delta tables...")
        tables = connector.list_tables()

        if tables:
            for t in tables:
                print(f"  [TABLE] {t}")
        else:
            print("  (No tables found)")

    except Exception as e:
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("1. Run 'az login' first for interactive authentication")
        print("2. Update config/fabric_config.py with your workspace/lakehouse details")
        print("3. Ensure you have access to the Fabric workspace")
