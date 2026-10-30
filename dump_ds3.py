import re
import json

with open('drive_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

callbacks = re.findall(r'AF_initDataCallback\((.*?)\);', html, re.DOTALL)
for cb in callbacks:
    if "'ds:3'" in cb or '"ds:3"' in cb:
        data_m = re.search(r'data:(.*?)(?:, sideChannel:|\}\s*$)', cb, re.DOTALL)
        if data_m:
            data_str = data_m.group(1).strip()
            try:
                data = json.loads(data_str)
                with open('ds3_data.json', 'w', encoding='utf-8') as out:
                    json.dump(data, out, indent=2, ensure_ascii=False)
                print("Dumped ds:3 to ds3_data.json")
            except Exception as e:
                print("JSON parse error:", e)
                with open('ds3_raw.txt', 'w', encoding='utf-8') as out:
                    out.write(data_str)
