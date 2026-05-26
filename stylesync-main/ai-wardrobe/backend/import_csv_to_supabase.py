import os
import csv
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

def parse_array(val):
    if not val:
        return []
    val = val.strip()
    if val.startswith('[') and val.endswith(']'):
        try:
            return json.loads(val)
        except Exception:
            pass
    # Otherwise split by comma/semicolon
    separator = ';' if ';' in val else ','
    return [item.strip() for item in val.split(separator) if item.strip()]

def parse_json(val):
    if not val:
        return {}
    val = val.strip()
    try:
        return json.loads(val)
    except Exception:
        return {"value": val}

def map_product_row(row):
    mapped = {}
    
    def get_val(keys):
        for k in keys:
            for rk in row.keys():
                if rk.strip().lower() == k.lower():
                    return row[rk]
        return None

    mapped["title"] = get_val(["title", "name", "product_name"]) or "Unnamed Product"
    mapped["description"] = get_val(["description", "desc"]) or ""
    mapped["image_url"] = get_val(["image_url", "image", "imageUrl"]) or ""
    
    price_val = get_val(["price", "amount"])
    try:
        mapped["price"] = float(price_val) if price_val else 0.0
    except ValueError:
        mapped["price"] = 0.0

    mapped["platform"] = get_val(["platform", "brand", "source"]) or "Flipkart"
    mapped["affiliate_link"] = get_val(["affiliate_link", "link", "url", "affiliateLink"]) or ""
    mapped["category"] = get_val(["category"]) or "unisex"
    mapped["gender"] = get_val(["gender"]) or "unisex"
    
    mapped["occasion"] = parse_array(get_val(["occasion"]))
    mapped["season"] = parse_array(get_val(["season"]))
    mapped["tags"] = parse_array(get_val(["tags"]))
    mapped["size_chart"] = parse_json(get_val(["size_chart", "sizes", "sizeChart"]))
    
    return mapped

def map_tryon_sample_row(row):
    mapped = {}
    
    def get_val(keys):
        for k in keys:
            for rk in row.keys():
                if rk.strip().lower() == k.lower():
                    return row[rk]
        return None

    mapped["sample_id"] = get_val(["sample_id", "id"]) or ""
    mapped["user_id"] = get_val(["user_id", "user"]) or "seed"
    mapped["category"] = get_val(["category"]) or "clothing"
    mapped["occasion"] = get_val(["occasion"]) or "casual"
    mapped["source"] = get_val(["source"]) or "seed"
    mapped["body_image_url"] = get_val(["body_image_url"])
    mapped["clothing_image_url"] = get_val(["clothing_image_url"])
    mapped["body_image_path"] = get_val(["body_image_path"])
    mapped["clothing_image_path"] = get_val(["clothing_image_path"])
    
    return mapped

def import_csv(file_path, table_name, batch_size=50):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_KEY must be set in your .env file.")
        return False

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File '{file_path}' does not exist.")
        return False

    print(f"Importing '{file_path}' into Supabase table '{table_name}'...")
    
    rows = []
    with open(path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if table_name == "products":
                rows.append(map_product_row(row))
            elif table_name == "tryon_samples":
                rows.append(map_tryon_sample_row(row))
            else:
                rows.append(row)

    total_rows = len(rows)
    print(f"Parsed {total_rows} rows from CSV.")
    
    inserted_count = 0
    for i in range(0, total_rows, batch_size):
        batch = rows[i:i+batch_size]
        try:
            supabase.table(table_name).insert(batch).execute()
            inserted_count += len(batch)
            print(f"✓ Inserted batch {i//batch_size + 1}: {inserted_count}/{total_rows}")
        except Exception as e:
            print(f"✗ Failed to insert batch starting at index {i}: {e}")
            print("Attempting to insert batch items individually to bypass/identify bad rows...")
            for idx, item in enumerate(batch):
                try:
                    supabase.table(table_name).insert(item).execute()
                    inserted_count += 1
                except Exception as item_err:
                    print(f"  ✗ Failed on item {i + idx} (Title: {item.get('title', 'N/A') or item.get('sample_id', 'N/A')}): {item_err}")

    print(f"\nDone. Successfully imported {inserted_count} out of {total_rows} records.")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import CSV dataset to Supabase products/tryon_samples table")
    parser.add_argument("--file", required=True, help="Path to the CSV file")
    parser.add_argument("--table", required=True, choices=["products", "tryon_samples"], help="Target Supabase table")
    parser.add_argument("--batch", type=int, default=50, help="Batch insert size (default: 50)")
    
    args = parser.parse_args()
    import_csv(args.file, args.table, args.batch)
