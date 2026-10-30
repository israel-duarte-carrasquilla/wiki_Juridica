import json

with open('ds3_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Let's inspect the top-level structure and look for subfolders or files
def scan_nodes(obj, depth=0):
    if depth > 7:
        return
    if isinstance(obj, list):
        # Check if obj looks like an item: has an id (string > 20 chars) and name
        for i, elem in enumerate(obj):
            if isinstance(elem, str) and len(elem) >= 20 and not elem.startswith("http"):
                # Check neighbors
                neighbors = [x for x in obj if isinstance(x, str)]
                print(f"Path at depth {depth}: {elem} -> {neighbors}")
                break
        for elem in obj:
            scan_nodes(elem, depth+1)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            scan_nodes(v, depth+1)

scan_nodes(data)
