import json

with open('ds3_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Let's inspect data[27][7][0]
folder_items = data[27][7][0]
print(f"Number of items in folder_items: {len(folder_items)}")
for i, item in enumerate(folder_items):
    # let's inspect the first element or strings in item
    strings = []
    def get_strings(x):
        if isinstance(x, str):
            strings.append(x)
        elif isinstance(x, list):
            for y in x:
                get_strings(y)
    get_strings(item)
    # Filter strings
    main_strings = [s for s in strings if len(s) < 80 and not s.startswith("http") and not s.startswith("driveweb")]
    print(f"Item {i}: {main_strings[:6]}")
