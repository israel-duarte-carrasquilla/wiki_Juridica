import json

with open('ds3_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find any list that has an ID and find names in it
def find_id_objects(obj):
    found = []
    if isinstance(obj, list):
        # If obj has a string of length 33 (typical Drive ID)
        ids = [x for x in obj if isinstance(x, str) and len(x) == 33]
        if ids:
            found.append((ids[0], obj))
        for item in obj:
            found.extend(find_id_objects(item))
    elif isinstance(obj, dict):
        for v in obj.values():
            found.extend(find_id_objects(v))
    return found

res = find_id_objects(data)
print(f"Total id objects: {len(res)}")
seen = set()
for file_id, full_obj in res:
    if file_id in seen:
        continue
    seen.add(file_id)
    # find names in full_obj
    strings = []
    def get_str(x):
        if isinstance(x, str):
            strings.append(x)
        elif isinstance(x, list):
            for y in x:
                get_str(y)
    get_str(full_obj)
    # filter strings
    clean = [s for s in strings if s != file_id and not s.startswith("http") and not s.startswith("driveweb") and not s.startswith("application/vnd") and len(s) < 80]
    print(f"ID: {file_id} => {clean[:5]}")
