import re
import json

with open('drive_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

callbacks = re.findall(r'AF_initDataCallback\((.*?)\);', html, re.DOTALL)
for cb in callbacks:
    if "'ds:1'" in cb or '"ds:1"' in cb:
        # extract data:
        data_m = re.search(r'data:(.*?)(?:, sideChannel:|\}\s*$)', cb, re.DOTALL)
        if data_m:
            data_str = data_m.group(1).strip()
            # Try to evaluate or parse json
            try:
                data = json.loads(data_str)
                with open('ds1_data.json', 'w', encoding='utf-8') as out:
                    json.dump(data, out, indent=2, ensure_ascii=False)
                print("Successfully dumped ds:1 to ds1_data.json")
            except Exception as e:
                print("JSON parse error:", e)
                with open('ds1_raw.txt', 'w', encoding='utf-8') as out:
                    out.write(data_str)
                print("Wrote raw ds1 to ds1_raw.txt")
