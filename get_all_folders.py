import re

with open('drive_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace \x22 with "
html_clean = html.replace('\\x22', '"').replace('\\/', '/')

# Find pattern ["ID", ["PARENT_ID"], "FOLDER_NAME", "application/vnd.google-apps.folder"
matches = re.findall(r'\["([a-zA-Z0-9_-]{28,})",\["([a-zA-Z0-9_-]{28,})"\],"([^"]+)",\s*"application/vnd\.google-apps\.folder"', html_clean)
print("Folders found via json pattern:")
folders = []
for fid, pid, name in matches:
    folders.append((fid, name))
    print(f"  Folder ID: {fid} | Name: {name}")

# Also check data-tooltip with folder IDs in HTML
rows = re.findall(r'data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"', html)
print("\nFolders found via data-tooltip:")
for fid, name in rows:
    name_clean = name.replace(" Shared folder", "")
    print(f"  ID: {fid} | Name: {name_clean}")
    if (fid, name_clean) not in folders:
        folders.append((fid, name_clean))

print(f"\nTotal folders: {len(folders)}")
