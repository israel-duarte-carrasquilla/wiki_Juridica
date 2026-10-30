import json

with open('ds3_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# The items array is usually in data[0] or data[0][0] or similar. Let's inspect where lists of items are.
entries = []
def find_entries(obj):
    if isinstance(obj, list):
        # In Google Drive ds:3, an item entry is a list starting with the ID or having ID as first element
        # and name as second or third element
        if len(obj) > 3 and isinstance(obj[0], str) and len(obj[0]) > 20 and isinstance(obj[2], str):
            # obj[0] is ID, obj[2] is name, obj[3] is mimeType
            entries.append((obj[0], obj[2], obj[3] if len(obj)>3 else ''))
        for item in obj:
            find_entries(item)
    elif isinstance(obj, dict):
        for v in obj.values():
            find_entries(v)

find_entries(data)
for item in entries:
    print(f"ID: {item[0]} | Name: {item[1]} | Type: {item[2]}")
