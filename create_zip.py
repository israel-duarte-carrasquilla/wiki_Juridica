import zipfile
import os

zip_filename = 'wiki_juridica_cpanel.zip'

files_to_include = [
    'index.html',
    'index.php',
    'api.php',
    '.htaccess',
    'style.css',
    'app.js',
    'jurisprudencia_db.json'
]

print("Creating ZIP file for cPanel deployment...")
with zipfile.ZipFile(zip_filename, 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
    for fn in files_to_include:
        if os.path.exists(fn):
            zipf.write(fn, arcname=fn)
            print(f"  + Added: {fn} ({os.path.getsize(fn)/1024:.1f} KB)")
        else:
            print(f"  ! Missing: {fn}")

# Also add README_CPANEL.md with instructions
cpanel_instructions = """# JurisWiki Colombia - Despliegue en Spaceship cPanel

## Instrucciones de Instalación en cPanel:

1. Ingresa a tu panel de control de **Spaceship cPanel**.
2. Dirígete a **Administrador de Archivos** (File Manager).
3. Entra a la carpeta de tu dominio o subdominio (generalmente `public_html` o `public_html/wiki`).
4. Haz clic en **Cargar** (Upload) y sube este archivo `wiki_juridica_cpanel.zip`.
5. Selecciona el archivo subido y haz clic en **Extraer** (Extract).
6. ¡Listo! Abre tu dominio en el navegador (ejemplo: `https://tudominio.com`).

### Contenido incluido:
- `index.html`: Interfaz web moderna con motor de IA y explorador.
- `index.php`: Punto de entrada PHP para servidores Apache/cPanel.
- `api.php`: Backend PHP para búsquedas y proxy de Gemini API.
- `.htaccess`: Reglas de compresión Gzip, caché y tipos MIME.
- `style.css`: Estilos legales personalizados (Tailwind + CSS).
- `app.js`: Motor de consulta, búsqueda RAG y conexión a IA.
- `jurisprudencia_db.json`: Base de datos de 387 providencias indexadas con temas y resuelve.
"""

with open('README_CPANEL.md', 'w', encoding='utf-8') as f:
    f.write(cpanel_instructions)

with zipfile.ZipFile(zip_filename, 'a', compression=zipfile.ZIP_DEFLATED) as zipf:
    zipf.write('README_CPANEL.md', arcname='README_CPANEL.md')
    print("  + Added: README_CPANEL.md")

print(f"\nZIP file successfully created: {zip_filename}")
print(f"Total size: {os.path.getsize(zip_filename)/1024:.1f} KB")
