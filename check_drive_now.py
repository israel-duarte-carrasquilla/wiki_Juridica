import urllib.request
import re
import json

url = 'https://drive.google.com/drive/folders/1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
    items = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
    print(f"Items in root folder: {len(items)}")
    for i in items:
        print("  -", i[1], f"({i[0]})")
except Exception as e:
    print("Error:", e)
