import zipfile
import os

zip_filename = 'wiki_juridica_cpanel.zip'

files_to_include = [
    'index.html',
    'index.php',
    'api.php',
    'sync_cron.php',
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

# Documentación para cPanel
cpanel_instructions = """# JurisWiki Colombia - Guía de Configuración y Auto-Actualización en Spaceship cPanel

## 1. Instalación Inicial en Spaceship cPanel
1. Ingresa a tu panel de **Spaceship cPanel**.
2. Abre el **Administrador de Archivos** (File Manager).
3. Entra a tu carpeta raíz (usualmente `public_html`).
4. Haz clic en **Cargar** (Upload) y sube `wiki_juridica_cpanel.zip`.
5. Selecciona el archivo y haz clic en **Extraer** (Extract).
6. ¡Listo! Tu web ya está en línea.

---

## 2. Configuración de la Actualización Automática en cPanel

En cPanel tienes 2 formas de automatizar la sincronización con Google Drive:

### Opción A: Cron Job Nativo en cPanel (Recomendado)
1. En tu cPanel, busca y abre la herramienta **Tareas Cron** (Cron Jobs).
2. En "Añadir nueva tarea cron", selecciona la frecuencia:
   - **Una vez por hora** (`0 * * * *`) o **Una vez al día** (`0 2 * * *`).
3. En el campo **Comando**, escribe una de estas dos opciones:

   **Opción A.1 (Línea de comando PHP):**
   ```bash
   /usr/local/bin/php /home/TU_USUARIO/public_html/sync_cron.php >/dev/null 2>&1
   ```
   *(Reemplaza `TU_USUARIO` por tu usuario de cPanel)*

   **Opción A.2 (Vía cURL / HTTP):**
   ```bash
   curl -s "https://tudominio.com/sync_cron.php?token=juriswiki2026" >/dev/null 2>&1
   ```
4. Haz clic en **Añadir nueva tarea cron**. A partir de ese momento, el servidor revisará automáticamente Google Drive en el intervalo fijado, descargará nuevos fallos y actualizará la base de datos sin que tengas que intervenir.

---

### Opción B: Botón Manual en la Web
En cualquier momento, cualquier administrador o usuario puede hacer clic en el botón:
👉 **`🔄 Sincronizar Drive`** ubicado en la barra superior de la página web.
Esto ejecutará la sincronización en vivo y actualizará el catálogo de providencias en pantalla.
"""

with open('README_CPANEL.md', 'w', encoding='utf-8') as f:
    f.write(cpanel_instructions)

with zipfile.ZipFile(zip_filename, 'a', compression=zipfile.ZIP_DEFLATED) as zipf:
    zipf.write('README_CPANEL.md', arcname='README_CPANEL.md')
    print("  + Added: README_CPANEL.md")

print(f"\nZIP file successfully created: {zip_filename}")
print(f"Total size: {os.path.getsize(zip_filename)/1024:.1f} KB")
