"""
Extract Complete Data Catalog from Fabric Lakehouse
====================================================
Uses OneLake direct file access - NO ODBC REQUIRED
Handles schema-enabled lakehouses (bronze/silver/gold layers)

Usage:
    python extract_data_catalog.py
"""

import os
import sys
import ssl
import urllib3
import json
import tempfile
from datetime import datetime

# SSL BYPASS
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
os.environ['AZURE_CLI_DISABLE_CONNECTION_VERIFICATION'] = '1'
os.environ['REQUESTS_CA_BUNDLE'] = ''
ssl._create_default_https_context = ssl._create_unverified_context

sys.path.insert(0, r'C:\Users\rbiren\Desktop\fabric_data_test')

import pandas as pd
from azure.identity import DefaultAzureCredential
from azure.storage.filedatalake import DataLakeServiceClient

from config.fabric_config import (
    WORKSPACE_ID,
    LAKEHOUSE_ID,
    WORKSPACE_NAME,
    LAKEHOUSE_NAME,
    ONELAKE_DFS_ENDPOINT,
)


class DataCatalogExtractor:
    """Extract data catalog from schema-enabled Fabric Lakehouse."""

    def __init__(self):
        print("=" * 80)
        print("FABRIC LAKEHOUSE DATA CATALOG EXTRACTOR")
        print("=" * 80)
        print(f"Workspace: {WORKSPACE_NAME}")
        print(f"Lakehouse: {LAKEHOUSE_NAME}")
        print("-" * 80)

        print("\n[AUTH] Connecting with cached Azure credentials...")
        self.credential = DefaultAzureCredential()

        self.service = DataLakeServiceClient(
            account_url=ONELAKE_DFS_ENDPOINT,
            credential=self.credential
        )
        self.fs = self.service.get_file_system_client(
            file_system=f"{WORKSPACE_NAME}/{LAKEHOUSE_NAME}.Lakehouse"
        )
        print("[AUTH] Connected to OneLake")

    def discover_tables(self, max_tables=1000):
        """Find all Delta tables by scanning for _delta_log folders."""
        print(f"\n[SCAN] Scanning for Delta tables (max {max_tables})...")

        tables = {}  # schema -> [{name, path}]
        count = 0

        for p in self.fs.get_paths(recursive=True):
            if '_delta_log' in p.name and p.is_directory:
                parts = p.name.split('/')
                delta_idx = parts.index('_delta_log')

                if delta_idx >= 2:
                    table_name = parts[delta_idx - 1]
                    schema_name = parts[delta_idx - 2] if delta_idx >= 3 else 'default'
                    table_path = '/'.join(parts[:delta_idx])

                    if schema_name not in tables:
                        tables[schema_name] = []

                    # Avoid duplicates
                    existing = [t['name'] for t in tables[schema_name]]
                    if table_name not in existing:
                        tables[schema_name].append({
                            'name': table_name,
                            'path': table_path
                        })
                        count += 1

                        if count % 50 == 0:
                            print(f"       Found {count} tables...")

                if count >= max_tables:
                    print(f"       Reached limit of {max_tables} tables")
                    break

        print(f"[SCAN] Found {count} tables in {len(tables)} schemas")
        return tables

    def read_delta_schema(self, table_path):
        """Read schema from Delta log."""
        schema_info = {
            'columns': [],
            'partition_columns': [],
            'num_files': 0,
            'total_size_bytes': 0
        }

        try:
            log_path = f"{table_path}/_delta_log"
            paths = list(self.fs.get_paths(path=log_path))
            json_files = [p for p in paths if p.name.endswith('.json')]

            if json_files:
                latest_log = sorted(json_files, key=lambda x: x.name)[-1]
                file_client = self.fs.get_file_client(latest_log.name)
                content = file_client.download_file().readall().decode('utf-8')

                for line in content.strip().split('\n'):
                    try:
                        entry = json.loads(line)

                        if 'metaData' in entry:
                            meta = entry['metaData']
                            schema_str = meta.get('schemaString', '{}')
                            schema = json.loads(schema_str)

                            if 'fields' in schema:
                                for field in schema['fields']:
                                    col_type = field.get('type', 'unknown')
                                    if isinstance(col_type, dict):
                                        col_type = col_type.get('type', str(col_type))

                                    schema_info['columns'].append({
                                        'name': field.get('name'),
                                        'type': col_type,
                                        'nullable': field.get('nullable', True)
                                    })

                            schema_info['partition_columns'] = meta.get('partitionColumns', [])

                        if 'add' in entry:
                            schema_info['num_files'] += 1
                            schema_info['total_size_bytes'] += entry['add'].get('size', 0)

                    except json.JSONDecodeError:
                        continue

        except Exception as e:
            pass  # Silent fail for schema read

        return schema_info

    def read_sample_data(self, table_path, num_rows=10):
        """Read sample data from parquet files."""
        try:
            paths = list(self.fs.get_paths(path=table_path))
            parquet_files = [
                p for p in paths
                if p.name.endswith('.parquet') and '_delta_log' not in p.name
            ]

            if parquet_files:
                file_client = self.fs.get_file_client(parquet_files[0].name)

                with tempfile.NamedTemporaryFile(suffix='.parquet', delete=False) as tmp:
                    tmp.write(file_client.download_file().readall())
                    tmp_path = tmp.name

                df = pd.read_parquet(tmp_path)
                os.unlink(tmp_path)
                return df.head(num_rows)

        except Exception:
            pass

        return pd.DataFrame()

    def extract_catalog(self, max_tables=200):
        """Extract full catalog."""
        catalog = {
            'extraction_time': datetime.now().isoformat(),
            'workspace': {'id': WORKSPACE_ID, 'name': WORKSPACE_NAME},
            'lakehouse': {'id': LAKEHOUSE_ID, 'name': LAKEHOUSE_NAME},
            'schemas': {}
        }

        # Discover tables
        tables_by_schema = self.discover_tables(max_tables=max_tables)

        # Process each schema
        total = sum(len(t) for t in tables_by_schema.values())
        processed = 0

        print(f"\n[EXTRACT] Processing {total} tables...")

        for schema, tables in tables_by_schema.items():
            catalog['schemas'][schema] = {'tables': {}}

            for table in tables:
                processed += 1
                table_name = table['name']
                table_path = table['path']

                print(f"  [{processed}/{total}] {schema}.{table_name}")

                # Get schema
                schema_info = self.read_delta_schema(table_path)

                # Get sample data
                sample_df = self.read_sample_data(table_path)
                sample_data = sample_df.to_dict('records') if not sample_df.empty else []

                catalog['schemas'][schema]['tables'][table_name] = {
                    'path': table_path,
                    'schema': schema_info,
                    'sample_data': sample_data,
                    'sample_columns': list(sample_df.columns) if not sample_df.empty else []
                }

        return catalog

    def generate_markdown(self, catalog):
        """Generate markdown report."""
        lines = []

        lines.append("# THOR Industries Lakehouse - Data Catalog\n")
        lines.append(f"**Generated**: {catalog['extraction_time']}")
        lines.append(f"**Workspace**: {catalog['workspace']['name']}")
        lines.append(f"**Lakehouse**: {catalog['lakehouse']['name']}\n")

        # Summary
        total_tables = sum(len(s['tables']) for s in catalog['schemas'].values())
        lines.append("## Summary\n")
        lines.append(f"| Schema | Tables |")
        lines.append(f"|--------|--------|")
        for schema, data in catalog['schemas'].items():
            lines.append(f"| **{schema}** | {len(data['tables'])} |")
        lines.append(f"| **TOTAL** | {total_tables} |")
        lines.append("")

        # Table of Contents
        lines.append("## Table of Contents\n")
        for schema in sorted(catalog['schemas'].keys()):
            lines.append(f"### {schema}")
            for table in sorted(catalog['schemas'][schema]['tables'].keys()):
                anchor = f"{schema}-{table}".lower().replace('_', '-')
                lines.append(f"- [{table}](#{anchor})")
            lines.append("")

        lines.append("---\n")

        # Detail for each table
        for schema in sorted(catalog['schemas'].keys()):
            lines.append(f"# Schema: {schema}\n")

            for table_name in sorted(catalog['schemas'][schema]['tables'].keys()):
                table = catalog['schemas'][schema]['tables'][table_name]
                schema_info = table['schema']

                lines.append(f"## {schema}.{table_name}\n")

                # Stats
                lines.append("### Statistics\n")
                lines.append("| Metric | Value |")
                lines.append("|--------|-------|")
                lines.append(f"| Columns | {len(schema_info['columns'])} |")
                lines.append(f"| Parquet Files | {schema_info['num_files']} |")
                size_mb = round(schema_info['total_size_bytes'] / 1024 / 1024, 2)
                lines.append(f"| Size | {size_mb} MB |")
                if schema_info['partition_columns']:
                    lines.append(f"| Partitions | {', '.join(schema_info['partition_columns'])} |")
                lines.append("")

                # Schema
                lines.append("### Columns\n")
                if schema_info['columns']:
                    lines.append("| # | Column | Type | Nullable |")
                    lines.append("|---|--------|------|----------|")
                    for i, col in enumerate(schema_info['columns'], 1):
                        nullable = 'Yes' if col.get('nullable', True) else 'No'
                        lines.append(f"| {i} | `{col['name']}` | {col['type']} | {nullable} |")
                else:
                    lines.append("*Schema not available*")
                lines.append("")

                # Sample Data
                lines.append("### Sample Data (10 rows)\n")
                sample = table.get('sample_data', [])
                cols = table.get('sample_columns', [])

                if sample and cols:
                    # Truncate wide tables
                    display_cols = cols[:10]
                    lines.append("| " + " | ".join(str(c)[:20] for c in display_cols) + " |")
                    lines.append("|" + "|".join(["---"] * len(display_cols)) + "|")

                    for row in sample[:10]:
                        vals = []
                        for c in display_cols:
                            v = str(row.get(c, ''))[:30]
                            v = v.replace('|', '/').replace('\n', ' ')
                            vals.append(v if v else 'NULL')
                        lines.append("| " + " | ".join(vals) + " |")

                    if len(cols) > 10:
                        lines.append(f"\n*...{len(cols) - 10} more columns not shown*")
                else:
                    lines.append("*No sample data available*")

                lines.append("\n---\n")

        return "\n".join(lines)


def main():
    try:
        extractor = DataCatalogExtractor()

        # Extract catalog (limit to 200 tables for speed)
        catalog = extractor.extract_catalog(max_tables=200)

        # Generate outputs
        print("\n" + "=" * 80)
        print("Generating documentation...")

        # Markdown
        md_content = extractor.generate_markdown(catalog)
        md_path = r'C:\Users\rbiren\Desktop\fabric_data_test\DATA_CATALOG.md'
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        print(f"Saved: {md_path}")

        # JSON
        json_path = r'C:\Users\rbiren\Desktop\fabric_data_test\data_catalog.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(catalog, f, indent=2, default=str)
        print(f"Saved: {json_path}")

        print("\n" + "=" * 80)
        print("EXTRACTION COMPLETE")
        print("=" * 80)

        # Summary
        for schema, data in catalog['schemas'].items():
            print(f"\n{schema}: {len(data['tables'])} tables")
            for name in list(data['tables'].keys())[:5]:
                cols = len(data['tables'][name]['schema']['columns'])
                print(f"    - {name}: {cols} columns")
            if len(data['tables']) > 5:
                print(f"    ... and {len(data['tables']) - 5} more")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
