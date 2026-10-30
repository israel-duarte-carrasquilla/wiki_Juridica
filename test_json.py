import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

file_id_json = "1nN1nwtX8HpNguF1pbwLiNFLB3M1Vuf1U"
url = f"https://drive.google.com/uc?export=download&id={file_id_json}"
try:
    with urllib.request.urlopen(url) as resp:
        content = resp.read().decode('utf-8', errors='replace')
    data = json.loads(content)
    print("Keys in JSON:", list(data.keys()))
    with open('sample_t001_24.json', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Saved to sample_t001_24.json")
except Exception as e:
    print("Error:", e)
