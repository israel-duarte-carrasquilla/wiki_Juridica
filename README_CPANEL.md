# JurisWiki Colombia - Despliegue en Spaceship cPanel

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
