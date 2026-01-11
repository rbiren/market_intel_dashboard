"""
Simple script to list ALL parquet files in the lakehouse.
"""

import requests
from azure.identity import DefaultAzureCredential

WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'
BASE_URL = f'https://onelake.dfs.fabric.microsoft.com/{WORKSPACE_ID}/{LAKEHOUSE_ID}'

# Get token
credential = DefaultAzureCredential()
token = credential.get_token('https://storage.azure.com/.default').token

# List ALL files from root recursively
url = f'{BASE_URL}?resource=filesystem&recursive=true'
headers = {
    'Authorization': f'Bearer {token}',
    'x-ms-version': '2021-06-08'
}

print("Fetching all files from lakehouse...")
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"Error: {resp.status_code}")
    print(resp.text[:500])
    exit(1)

paths = resp.json().get('paths', [])
print(f"Total items found: {len(paths)}")

# Filter to just parquet files
parquet_files = [p for p in paths if p.get('name', '').endswith('.parquet')]
print(f"Parquet files: {len(parquet_files)}")

# Group by top-level directory
by_folder = {}
for f in parquet_files:
    path = f.get('name', '')
    parts = path.split('/')
    if len(parts) >= 2:
        top_level = parts[0]
        if top_level not in by_folder:
            by_folder[top_level] = []
        by_folder[top_level].append(path)

print("\n" + "="*60)
print("PARQUET FILES BY TOP-LEVEL FOLDER")
print("="*60)

for folder, files in sorted(by_folder.items()):
    print(f"\n{folder}/  ({len(files)} parquet files)")
    # Show first 5 example paths
    for path in files[:5]:
        size_bytes = next((p.get('contentLength', 0) for p in paths if p.get('name') == path), 0)
        size_mb = int(size_bytes) / (1024*1024) if size_bytes else 0
        print(f"  {path} ({size_mb:.2f} MB)")
    if len(files) > 5:
        print(f"  ... and {len(files) - 5} more")

# Save full list to file
with open('all_parquet_files.txt', 'w') as f:
    for p in sorted(parquet_files, key=lambda x: x.get('name', '')):
        f.write(f"{p.get('name')}\t{p.get('contentLength', 0)}\n")

print(f"\nFull list saved to: all_parquet_files.txt")
