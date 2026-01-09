"""
Setup script for installing dependencies.
Run: python setup.py
"""

import subprocess
import sys


def install_dependencies():
    """Install required Python packages."""
    print("Installing dependencies...")
    print("=" * 50)

    packages = [
        "azure-identity",
        "azure-storage-file-datalake",
        "pyodbc",
        "pandas",
        "requests",
    ]

    for package in packages:
        print(f"\nInstalling {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

    print("\n" + "=" * 50)
    print("All dependencies installed successfully!")
    print("\nNext steps:")
    print("1. Update config/fabric_config.py with your Fabric details")
    print("2. Run 'az login' to authenticate with Azure")
    print("3. Run example scripts in the examples folder")


def check_odbc_driver():
    """Check if ODBC Driver 18 is installed."""
    print("\nChecking ODBC Driver...")

    try:
        import pyodbc
        drivers = [d for d in pyodbc.drivers() if "ODBC Driver" in d]

        if drivers:
            print(f"Found ODBC drivers: {drivers}")
            if any("18" in d for d in drivers):
                print("ODBC Driver 18 is installed!")
            else:
                print("\nWarning: ODBC Driver 18 not found.")
                print("Download from: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server")
        else:
            print("\nNo ODBC drivers found. Please install ODBC Driver 18 for SQL Server.")
    except ImportError:
        print("pyodbc not installed yet.")


if __name__ == "__main__":
    install_dependencies()
    check_odbc_driver()
