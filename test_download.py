import urllib.request

file_id = "1C2BFLM5pRvZ2B54dJe65comfyjxKhdff" # Ficha_05001233300020180036101.md
url = f"https://drive.google.com/uc?export=download&id={file_id}"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
    print("Content preview:")
    print(content[:1000])
except Exception as e:
    print("Download error:", e)
