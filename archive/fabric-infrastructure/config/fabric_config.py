"""
Microsoft Fabric Lakehouse Configuration
=========================================
Update these values with your Fabric workspace and lakehouse details.
"""

# =============================================================================
# FABRIC WORKSPACE CONFIGURATION
# =============================================================================

# Your Fabric Workspace ID (found in the URL when viewing your workspace)
# Example: https://app.fabric.microsoft.com/groups/{WORKSPACE_ID}/...
WORKSPACE_ID = "9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc"

# Your Fabric Workspace Name
WORKSPACE_NAME = "THOR Industries"

# =============================================================================
# LAKEHOUSE CONFIGURATION
# =============================================================================

# Lakehouse ID (found in the URL when viewing your lakehouse)
LAKEHOUSE_ID = "06dc42ac-4151-4bb9-94fb-1a03edf49600"

# Lakehouse Name
LAKEHOUSE_NAME = "thor_industries_de_lakehouse"

# =============================================================================
# ONELAKE CONFIGURATION (for direct file access)
# =============================================================================

# OneLake account name (always 'onelake' for Fabric)
ONELAKE_ACCOUNT_NAME = "onelake"

# OneLake DFS endpoint
ONELAKE_DFS_ENDPOINT = f"https://{ONELAKE_ACCOUNT_NAME}.dfs.fabric.microsoft.com"

# Full OneLake path to your lakehouse Files folder
# Format: {workspace_name}/{lakehouse_name}.Lakehouse/Files
ONELAKE_FILES_PATH = f"{WORKSPACE_NAME}/{LAKEHOUSE_NAME}.Lakehouse/Files"

# Full OneLake path to your lakehouse Tables folder (Delta tables)
ONELAKE_TABLES_PATH = f"{WORKSPACE_NAME}/{LAKEHOUSE_NAME}.Lakehouse/Tables"

# =============================================================================
# SQL ENDPOINT CONFIGURATION (for SQL queries)
# =============================================================================

# SQL Endpoint server (found in Lakehouse settings -> SQL endpoint)
# Format: {random-string}.datawarehouse.fabric.microsoft.com
SQL_ENDPOINT_SERVER = "ahwfoxqla34u7cm7s4vjzj2jtq-4r6hfhd6l4eebmy66pr33dqk3q.datawarehouse.fabric.microsoft.com"

# Database name (usually same as lakehouse name)
SQL_DATABASE_NAME = LAKEHOUSE_NAME

# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================

# Azure Tenant ID (for service principal auth)
TENANT_ID = "your-tenant-id"

# Client/Application ID (for service principal auth - optional)
CLIENT_ID = "your-client-id"

# Client Secret (for service principal auth - optional, use env var instead)
# CLIENT_SECRET = "your-client-secret"  # Better to use environment variable

# =============================================================================
# ENVIRONMENT VARIABLES TO SET (for service principal authentication)
# =============================================================================
# Set these in your environment instead of hardcoding secrets:
#
# Windows PowerShell:
#   $env:AZURE_TENANT_ID = "your-tenant-id"
#   $env:AZURE_CLIENT_ID = "your-client-id"
#   $env:AZURE_CLIENT_SECRET = "your-client-secret"
#
# Windows CMD:
#   set AZURE_TENANT_ID=your-tenant-id
#   set AZURE_CLIENT_ID=your-client-id
#   set AZURE_CLIENT_SECRET=your-client-secret
#
# For interactive login (recommended for development):
#   Run `az login` in terminal before running scripts
# =============================================================================
