import json

with open('ds3_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Let's search for '01_Corte_Constitucional' in ds3_data.json and see what its surrounding list or dict looks like!
def search_val(obj, target, path=""):
    if isinstance(obj, str) and target in obj:
        print(f"Found '{target}' at {path}: {obj}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            search_val(v, target, f"{path}[{i}]")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            search_val(v, target, f"{path}.{k}")

search_val(data, "01_Corte_Constitucional")
