import json

with open('ds1_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find all items recursively that look like drive files
def find_items(obj, path=""):
    results = []
    if isinstance(obj, list):
        # A file entry usually has [id, title, mimeType, ...] or similar
        # Let's check if this list contains an id and a title
        if len(obj) >= 2 and isinstance(obj[0], str) and len(obj[0]) > 20 and isinstance(obj[1], str) and not obj[1].startswith('http'):
            results.append((obj[0], obj[1], obj))
        for i, item in enumerate(obj):
            results.extend(find_items(item, f"{path}[{i}]"))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            results.extend(find_items(v, f"{path}.{k}"))
    return results

items = find_items(data)
print(f"Potential items found: {len(items)}")

# Let's inspect unique ones
seen = set()
for file_id, title, full in items:
    if file_id not in seen:
        seen.add(file_id)
        print(f"ID: {file_id} | Title: {title}")
