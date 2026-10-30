import urllib.request
import re
import json

folder_id = '1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ'
url = f'https://drive.google.com/drive/folders/{folder_id}'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
    print('Fetched HTML length:', len(html))
    with open('drive_page.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Saved to drive_page.html')
except Exception as e:
    print('Error:', e)
