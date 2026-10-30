# 🏛️ JurisWiki Colombia • Asistente Jurisprudencial con IA

Plataforma web de inteligencia jurídica y relatoría para la consulta de jurisprudencia colombiana. Permite realizar consultas en lenguaje natural sobre cualquier tema legal (por ejemplo: *"ejemplos de fallos de tutela por alimentos o derechos de familia"*), identificando las sentencias aplicables y proporcionando la **citación textual exacta del RESUELVE** y la citación formal para memoriales judiciales.

---

## 🚀 Características Principales

1. **Asistente Jurídico con Inteligencia Artificial**:
   - Responde preguntas en lenguaje natural sobre derecho colombiano.
   - Analiza la base de datos de jurisprudencia para determinar **cuáles tutelas o sentencias aplican**.
   - Extrae y destaca la **cita textual de la parte resolutiva (`RESUELVE`)**.
   - Genera la **citación jurídica formal** (ej. *Corte Constitucional, Sentencia T-001/24, M.P. Cristina Pardo Schlesinger*).
   - Enlace directo para abrir el documento original en Google Drive o en la relatoría oficial.
   - Botón de 1-clic para copiar la citación al portapapeles.

2. **Doble Modalidad de IA**:
   - **Motor RAG Local Integrado**: Funciona de forma 100% autónoma y offline sin requerir claves de API.
   - **Google Gemini API**: Compatible con Gemini 2.5 Flash / 1.5 Flash ingresando la API Key en el panel de configuración.

3. **Explorador & Buscador Multifiltro**:
   - Búsqueda libre en tiempo real sobre 387 providencias.
   - Filtros por:
     - **Corporación Judicial**: Corte Constitucional, Corte Suprema de Justicia, Consejo de Estado, Tribunales Departamentales, Superintendencias, Tribunales de Arbitramento.
     - **Tipo de Providencia**: Tutela (T), Unificación (SU), Constitucionalidad (C), Auto (A), Casación Civil, Casación Laboral, Casación Penal, Laudos Arbitrales, Leyes.
     - **Año**: 2020 a 2026.
   - Ficha técnica completa de cada decisión con síntesis del asunto y parte resolutiva extendida.

---

## 💻 Ejecución en Local (Puerto 8880)

Para iniciar el servidor localmente en el **puerto 8880**:

```bash
# Opción 1: Con el script del servidor incluido
python server.py --port 8880

# Opción 2: Con el módulo http de Python
python -m http.server 8880
```

Luego abre tu navegador en:
👉 **[http://localhost:8880](http://localhost:8880)**

---

## 🌐 Despliegue en Spaceship cPanel

El proyecto incluye el archivo comprimido **`wiki_juridica_cpanel.zip`** listo para producción:

1. Ingresa a tu cPanel en **Spaceship**.
2. Abre el **Administrador de Archivos (File Manager)**.
3. Entra a `public_html` (o al directorio de tu subdominio).
4. Sube el archivo `wiki_juridica_cpanel.zip`.
5. Haz clic derecho y selecciona **Extract** (Extraer).
6. ¡Listo! La web estará activa en tu dominio.

### Estructura de archivos para cPanel:
- `index.html`: Interfaz moderna SPA con Tailwind CSS y responsive design.
- `index.php`: Punto de entrada PHP para servidores Apache/cPanel.
- `api.php`: Backend PHP para búsquedas y proxy opcional de Gemini API.
- `.htaccess`: Optimización Gzip, tipos MIME UTF-8 y caché.
- `style.css`: Estilos visuales con temática jurídica y tipografía legal.
- `app.js`: Motor de consulta, búsqueda léxica/semántica RAG y conector IA.
- `jurisprudencia_db.json`: Base de datos de 387 providencias indexadas.

---

## 📂 Cobertura del Repositorio de Documentos

Documentos indexados desde la carpeta de Google Drive:
- **Corte Constitucional**:
  - Salas de Revisión de Tutelas (T)
  - Sala Plena de Unificación (SU)
  - Sala Plena de Constitucionalidad (C)
  - Salas Especiales de Seguimiento y Autos (A)
- **Corte Suprema de Justicia**:
  - Sala de Casación Civil, Agraria y Rural
  - Sala de Casación Laboral
  - Sala de Casación Penal
- **Consejo de Estado**: Secciones Primera, Segunda, Tercera, Cuarta y Quinta.
- **Tribunales Superiores de Distrito Judicial**: Medellín, Barranquilla, Bogotá, etc.
- **Superintendencias con Funciones Jurisdiccionales**: Superservicios, Supersociedades, etc.
- **Tribunales de Arbitramento y Laudos**: CAC Cali, Barranquilla, Medellín, Bogotá.
- **Normativa y Leyes**: Secretaría del Senado.

---

## ⚖️ Licencia y Uso
Desarrollado para la investigación y consulta del derecho y la jurisprudencia en Colombia.
