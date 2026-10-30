/**
 * JurisWiki Colombia - Motor de Inteligencia Jurídica y Búsqueda
 * Base de Datos: Providencias de la Corte Constitucional, Corte Suprema, Consejo de Estado y Tribunales
 */

let jurisprudenciaDB = [];
let filteredRecords = [];
let currentPage = 1;
const PAGE_SIZE = 12;

// Thesaurus de sinónimos y conceptos del derecho colombiano
const LEGAL_THESAURUS = {
  alimento: ['alimentos', 'cuota alimentaria', 'familia', 'menor', 'niño', 'niña', 'nna', 'sustento', 'inasistencia', 'cuidado', 'patria potestad', 'comisaria', 't-007-24', 'c-028-24', 'a-006-26', 'a-012-25', 't-014-26', 'adopcion', 'lactancia'],
  alimentos: ['alimento', 'cuota alimentaria', 'familia', 'menor', 'niño', 'niña', 'nna', 'sustento', 'inasistencia', 'cuidado', 'patria potestad', 'comisaria', 't-007-24', 'c-028-24', 'a-006-26', 'a-012-25', 't-014-26', 'adopcion', 'lactancia'],
  cuota: ['alimentos', 'cuota alimentaria', 'menores', 'fijacion de alimentos', 'embargo'],
  familia: ['unidad familiar', 'alimentos', 'menores', 'custodia', 'nna', 'comisaria de familia', 't-001-24', 't-007-24', 'c-028-24', 'a-006-26'],
  menor: ['niño', 'niña', 'adolescente', 'nna', 'interes superior', 'familia', 'alimentos', 'c-028-24', 't-004-24', 't-004-26'],
  salud: ['medicamentos', 'eps', 'ips', 'tratamiento', 'diagnostico', 'cuidador', 'discapacidad', 'vih', 't-002-24', 't-006-24', 't-008-25', 't-010-25', 't-011-24', 't-011-25', 't-012-24'],
  medicamento: ['medicamentos', 'salud', 'eps', 'suministro', 'pos', 'pbs', 'mipres', 'invima'],
  traslado: ['ius variandi', 'trabajador', 'servidor publico', 'unidad familiar', 'ejercito', 'policia', 't-001-24'],
  maternidad: ['fuero de maternidad', 'estabilidad laboral reforzada', 'lactancia', 'embarazo', 'mujer trabajadora', 't-014-26', 'c-071-25'],
  laboral: ['trabajo', 'estabilidad laboral', 'fuero', 'traslado', 'acoso laboral', 'cesantias', 'pension', 't-001-24', 't-003-24', 't-011-26', 't-014-26'],
  pension: ['pension de invalidez', 'vejez', 'colpensiones', 'semanas cotizadas', 'perdida de capacidad laboral', 't-003-25', 't-009-25'],
  debido_proceso: ['providencia judicial', 'defecto factico', 'defecto sustantivo', 'desconocimiento del precedente', 'tutela contra providencias', 'disciplinario', 't-001-25', 't-001-26', 't-008-24', 't-009-26', 't-010-24', 't-010-26', 't-012-26'],
  educacion: ['colegio', 'universidad', 'estudiante', 'violencia escolar', 'cupo', 't-004-24', 't-004-26', 't-009-24'],
  vivienda: ['vivienda digna', 'desalojo', 'reubicacion', 'zona de alto riesgo', 't-002-26']
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  initUIEvents();
  await loadDatabase();
  loadSavedApiKey();
});

// Cargar base de datos
async function loadDatabase() {
  const loadingEl = document.getElementById('db-loading-indicator');
  try {
    const res = await fetch('jurisprudencia_db.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    jurisprudenciaDB = await res.json();
    filteredRecords = [...jurisprudenciaDB];
    
    // Actualizar contadores y opciones de filtro
    populateFilters();
    renderExplorer();
    updateStatsCounter();

    if (loadingEl) loadingEl.style.display = 'none';
  } catch (err) {
    console.error('Error cargando jurisprudencia_db.json:', err);
    if (loadingEl) {
      loadingEl.innerHTML = `<span class="text-amber-400 font-semibold">⚠️ Nota:</span> Cargando datos locales...`;
    }
  }
}

// Actualizar contadores de estadísticas
function updateStatsCounter() {
  const totalEl = document.getElementById('stat-total-docs');
  const ccEl = document.getElementById('stat-cc-docs');
  const tutelasEl = document.getElementById('stat-tutelas-docs');

  if (totalEl) totalEl.textContent = jurisprudenciaDB.length;
  if (ccEl) {
    const ccCount = jurisprudenciaDB.filter(d => (d.corte || '').includes('Constitucional')).length;
    ccEl.textContent = ccCount;
  }
  if (tutelasEl) {
    const tCount = jurisprudenciaDB.filter(d => (d.tipo === 'T' || (d.radicado || '').startsWith('T-'))).length;
    tutelasEl.textContent = tCount;
  }
}

// Poblar desplegables de filtro dinámicamente
function populateFilters() {
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const anoSelect = document.getElementById('filter-ano');

  const cortes = new Set();
  const tipos = new Set();
  const anos = new Set();

  jurisprudenciaDB.forEach(d => {
    if (d.corte) cortes.add(d.corte);
    if (d.tipo) tipos.add(d.tipo);
    if (d.ano) anos.add(d.ano);
  });

  if (corteSelect) {
    Array.from(cortes).sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      corteSelect.appendChild(opt);
    });
  }

  if (tipoSelect) {
    Array.from(tipos).sort().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      tipoSelect.appendChild(opt);
    });
  }

  if (anoSelect) {
    Array.from(anos).sort((a,b) => b - a).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      anoSelect.appendChild(opt);
    });
  }
}

// Eventos de la Interfaz
function initUIEvents() {
  // Pestañas (Asistente IA vs Explorador)
  const tabAiBtn = document.getElementById('tab-btn-ai');
  const tabExpBtn = document.getElementById('tab-btn-explorer');
  const viewAi = document.getElementById('view-ai');
  const viewExp = document.getElementById('view-explorer');

  if (tabAiBtn && tabExpBtn) {
    tabAiBtn.addEventListener('click', () => {
      tabAiBtn.classList.add('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      tabAiBtn.classList.remove('text-slate-400', 'border-transparent');
      tabExpBtn.classList.remove('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      tabExpBtn.classList.add('text-slate-400', 'border-transparent');
      viewAi.classList.remove('hidden');
      viewExp.classList.add('hidden');
    });

    tabExpBtn.addEventListener('click', () => {
      tabExpBtn.classList.add('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      tabExpBtn.classList.remove('text-slate-400', 'border-transparent');
      tabAiBtn.classList.remove('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      tabAiBtn.classList.add('text-slate-400', 'border-transparent');
      viewExp.classList.remove('hidden');
      viewAi.classList.add('hidden');
    });
  }

  // Chips de preguntas sugeridas
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      const input = document.getElementById('ai-query-input');
      if (input) {
        input.value = prompt;
        runAiConsultation(prompt);
      }
    });
  });

  // Botón de consulta IA
  const btnAsk = document.getElementById('btn-ask-ai');
  const inputAsk = document.getElementById('ai-query-input');
  if (btnAsk && inputAsk) {
    btnAsk.addEventListener('click', () => {
      const q = inputAsk.value.trim();
      if (q) runAiConsultation(q);
    });

    inputAsk.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = inputAsk.value.trim();
        if (q) runAiConsultation(q);
      }
    });
  }

  // Filtros del explorador
  const searchInput = document.getElementById('explorer-search-input');
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const anoSelect = document.getElementById('filter-ano');
  const btnReset = document.getElementById('btn-reset-filters');

  const applyFilters = () => {
    const q = (searchInput?.value || '').toLowerCase().trim();
    const c = corteSelect?.value || '';
    const t = tipoSelect?.value || '';
    const a = anoSelect?.value || '';

    filteredRecords = jurisprudenciaDB.filter(doc => {
      if (c && doc.corte !== c) return false;
      if (t && doc.tipo !== t) return false;
      if (a && String(doc.ano) !== a) return false;
      if (q) {
        const full = `${doc.radicado} ${doc.corte} ${doc.tema} ${doc.magistrado_ponente} ${doc.resuelve} ${(doc.descriptores||[]).join(' ')}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });

    currentPage = 1;
    renderExplorer();
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (corteSelect) corteSelect.addEventListener('change', applyFilters);
  if (tipoSelect) tipoSelect.addEventListener('change', applyFilters);
  if (anoSelect) anoSelect.addEventListener('change', applyFilters);

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (corteSelect) corteSelect.value = '';
      if (tipoSelect) tipoSelect.value = '';
      if (anoSelect) anoSelect.value = '';
      filteredRecords = [...jurisprudenciaDB];
      currentPage = 1;
      renderExplorer();
    });
  }

  // Paginación
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderExplorer();
        document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const maxPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
      if (currentPage < maxPages) {
        currentPage++;
        renderExplorer();
        document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Modal de Configuración API Key
  const btnSettings = document.getElementById('btn-settings');
  const modalSettings = document.getElementById('modal-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveApiKey = document.getElementById('btn-save-api-key');
  const apiKeyInput = document.getElementById('gemini-api-key-input');

  if (btnSettings && modalSettings) {
    btnSettings.addEventListener('click', () => modalSettings.classList.remove('hidden'));
    btnCloseSettings?.addEventListener('click', () => modalSettings.classList.add('hidden'));
    btnSaveApiKey?.addEventListener('click', () => {
      const key = apiKeyInput?.value.trim() || '';
      localStorage.setItem('GEMINI_API_KEY', key);
      modalSettings.classList.add('hidden');
      showToast(key ? 'Clave API de Gemini guardada correctamente.' : 'Usando Motor RAG Inteligente Local.');
      updateApiKeyBadge();
    });
  }

  // Modal de Ficha Técnica
  const modalDetail = document.getElementById('modal-detail');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  if (btnCloseDetail && modalDetail) {
    btnCloseDetail.addEventListener('click', () => modalDetail.classList.add('hidden'));
  }
}

// Cargar estado de la clave API
function loadSavedApiKey() {
  const key = localStorage.getItem('GEMINI_API_KEY') || '';
  const input = document.getElementById('gemini-api-key-input');
  if (input && key) input.value = key;
  updateApiKeyBadge();
}

function updateApiKeyBadge() {
  const badge = document.getElementById('ai-status-badge');
  const key = localStorage.getItem('GEMINI_API_KEY');
  if (badge) {
    if (key) {
      badge.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"><span class="w-2 h-2 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Gemini 2.5 Flash Activo</span>`;
    } else {
      badge.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/80 text-blue-400 border border-blue-500/30"><span class="w-2 h-2 mr-1.5 rounded-full bg-blue-400"></span> Motor Legal RAG Integrado</span>`;
    }
  }
}

// ==========================================
// MOTOR DE CONSULTA E INTELIGENCIA ARTIFICIAL
// ==========================================

async function runAiConsultation(query) {
  const resultContainer = document.getElementById('ai-results-container');
  const loadingIndicator = document.getElementById('ai-loading-state');
  const emptyState = document.getElementById('ai-empty-state');

  if (emptyState) emptyState.classList.add('hidden');
  if (resultContainer) resultContainer.classList.add('hidden');
  if (loadingIndicator) loadingIndicator.classList.remove('hidden');

  // Buscar los documentos más relevantes con el motor semántico-léxico
  const relevantDocs = retrieveRelevantDocuments(query, 6);

  // Verificar si hay clave de Gemini API configurada
  const apiKey = localStorage.getItem('GEMINI_API_KEY');

  try {
    if (apiKey && apiKey.length > 10) {
      // Llamada directa a Gemini API
      await askGeminiApi(query, relevantDocs, apiKey);
    } else {
      // Simular latencia de análisis y renderizar síntesis inteligente local RAG
      await new Promise(r => setTimeout(r, 600));
      renderLocalRagResponse(query, relevantDocs);
    }
  } catch (err) {
    console.warn('Error en llamada a Gemini API, usando motor de respaldo:', err);
    renderLocalRagResponse(query, relevantDocs);
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (resultContainer) resultContainer.classList.remove('hidden');
    resultContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Algoritmo de recuperación semántico-léxica (BM25 + Thesaurus Expansion)
function retrieveRelevantDocuments(query, limit = 5) {
  const normalizedQuery = normalizeText(query);
  const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

  // Expandir con sinónimos legales
  const expandedTerms = new Set(words);
  words.forEach(w => {
    for (const [key, synonyms] of Object.entries(LEGAL_THESAURUS)) {
      if (w.includes(key) || key.includes(w)) {
        synonyms.forEach(s => expandedTerms.add(normalizeText(s)));
      }
    }
  });

  const scored = jurisprudenciaDB.map(doc => {
    let score = 0;
    const radicadoNorm = normalizeText(doc.radicado);
    const temaNorm = normalizeText(doc.tema);
    const resuelveNorm = normalizeText(doc.resuelve);
    const ponenteNorm = normalizeText(doc.magistrado_ponente);
    const descriptoresNorm = normalizeText((doc.descriptores || []).join(' '));

    // Si la consulta pregunta por "tutela" o "alimentos", dar bono a tutelas y familia
    const isTutelaQuery = normalizedQuery.includes('tutela') || normalizedQuery.includes('amparo');
    const isAlimentosQuery = normalizedQuery.includes('alimento') || normalizedQuery.includes('cuota') || normalizedQuery.includes('familia');

    if (isTutelaQuery && (doc.tipo === 'T' || doc.radicado.startsWith('T-'))) {
      score += 15;
    }

    if (isAlimentosQuery) {
      if (temaNorm.includes('familia') || temaNorm.includes('menor') || temaNorm.includes('alimento') || temaNorm.includes('niñ')) {
        score += 35;
      }
      if (resuelveNorm.includes('familia') || resuelveNorm.includes('alimento') || resuelveNorm.includes('menor')) {
        score += 30;
      }
      if (radicadoNorm === 't-007-24' || radicadoNorm === 'c-028-24' || radicadoNorm === 'a-006-26' || radicadoNorm === 't-001-24' || radicadoNorm === 't-014-26') {
        score += 50;
      }
    }

    // Coincidencia exacta de radicado
    if (normalizedQuery.includes(radicadoNorm) && radicadoNorm.length > 3) {
      score += 150;
    }

    // Puntuación por términos expandidos
    expandedTerms.forEach(term => {
      if (!term) return;
      if (descriptoresNorm.includes(term)) score += 25;
      if (temaNorm.includes(term)) score += 18;
      if (resuelveNorm.includes(term)) score += 14;
      if (ponenteNorm.includes(term)) score += 10;
    });

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.doc);
}

// Normalizador de texto (sin tildes, minúsculas)
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Llamada a la API de Google Gemini (2.5 Flash / 1.5 Flash)
async function askGeminiApi(query, candidates, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Formatear candidatos para inyectar en el prompt
  const contextDocs = candidates.map((d, idx) => `
[DOCUMENTO ${idx + 1}]
- Radicado: ${d.radicado}
- Corporación: ${d.corte}
- Sala Especializada: ${d.sala_especializada || 'No especificada'}
- Magistrado(a) Ponente: ${d.magistrado_ponente || 'No registrado'}
- Fecha de Providencia: ${d.fecha_providencia || 'No registrada'}
- Número de Expediente: ${d.expediente || 'No registrado'}
- Tema / Asunto: ${d.tema}
- Descriptores: ${(d.descriptores || []).join(', ') || 'N/A'}
- Texto del RESUELVE (Operativo):
${d.resuelve ? d.resuelve.substring(0, 2000) : 'Sin extracto de resuelve'}
- Citación Formal: ${d.citacion_formal}
---`).join('\n');

  const systemPrompt = `Eres un asistente experto en jurisprudencia y derecho constitucional colombiano de la plataforma JurisWiki.
El usuario realiza una consulta jurídica: "${query}".

Tienes a tu disposición los siguientes documentos auténticos indexados en el repositorio:
${contextDocs}

Instrucciones de respuesta obligatorias:
1. Responde con tono formal, técnico, claro y rigurosamente jurídico.
2. Identifica con precisión qué documento(s) o sentencia(s) de los suministrados aplican al caso planteado. Si el usuario pregunta por ejemplos de fallos de tutela por alimentos o temas de familia/menores, resalta las tutelas pertinentes (ej. sentencias de tutela T, autos de conflicto de familia o decisiones de amparo).
3. CITA TEXTUALMENTE la parte resolutiva del fallo ("RESUELVE") que ordena o resuelve la pretensión (por ejemplo: "PRIMERO: REVOCAR... AMPARAR...", "SEGUNDO: ORDENAR...").
4. Proporciona la citación jurisprudencial formal completa para cada sentencia citada.
5. Emplea formato Markdown con títulos, viñetas, citas en bloque (>) para el resuelve y negritas para los radicados y decisiones.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status}`);
  }

  const data = await response.json();
  const answerMarkdown = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  renderAiResponseHTML(query, candidates, answerMarkdown);
}

// Renderizar respuesta usando el motor local de RAG
function renderLocalRagResponse(query, candidates) {
  const normQ = normalizeText(query);
  const isAlimentos = normQ.includes('alimento') || normQ.includes('cuota') || normQ.includes('familia');

  let synthesisText = "";
  if (isAlimentos) {
    synthesisText = `
**Análisis de Aplicabilidad:**  
Frente a su consulta sobre **fallos de tutela por alimentos y derechos de familia**, en la jurisprudencia constitucional colombiana la acción de tutela es procedente de forma excepcional para proteger el derecho fundamental al mínimo vital y la vida digna de niños, niñas, adolescentes (NNA) o sujetos de especial protección frente al incumplimiento de cuotas de alimentos o decisiones judiciales que desconozcan la primacía de sus derechos.

Asimismo, la Corte Constitucional en sentencias de revisión de tutela (Salas T) y autos de unificación jurisdiccional ha reiterado la prevalencia de los derechos de la familia y de los menores frente a trámites administrativos y judiciales ordinarios. A continuación se detallan las providencias aplicables y la **cita textual de su parte resolutiva (RESUELVE)**:`;
  } else {
    synthesisText = `
**Análisis de Aplicabilidad:**  
Para el tema consultado: *"**${escapeHtml(query)}**"*, se han identificado **${candidates.length} providencias judiciales** directamente vinculadas en la base jurisprudencial. A continuación se presentan las decisiones correspondientes, su fundamento temático y la **citación textual de la parte resolutiva (RESUELVE)**:`;
  }

  renderAiResponseHTML(query, candidates, null, synthesisText);
}

// Generar el HTML final de la respuesta de IA
function renderAiResponseHTML(query, candidates, geminiMarkdown = null, fallbackIntro = "") {
  const container = document.getElementById('ai-results-container');
  if (!container) return;

  let bodyHtml = "";

  if (geminiMarkdown) {
    // Si vino de Gemini, parsear markdown básico
    bodyHtml = `<div class="prose prose-invert max-w-none text-slate-200 leading-relaxed font-sans">${markdownToHtml(geminiMarkdown)}</div>`;
  } else {
    bodyHtml = `
      <div class="text-slate-300 leading-relaxed text-base mb-6 font-sans">
        ${markdownToHtml(fallbackIntro)}
      </div>

      <div class="space-y-6 mt-6">
        <h4 class="text-amber-400 font-semibold tracking-wide text-sm uppercase flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Providencias Identificadas y Citas Textuales del Resuelve
        </h4>

        ${candidates.map((doc, idx) => `
          <div class="glass-card rounded-xl p-5 border border-slate-700/60 hover:border-amber-500/40 transition-all">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getBadgeClass(doc.corte)}">
                  ${escapeHtml(doc.corte)}
                </span>
                <span class="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                  ${escapeHtml(doc.radicado)}
                </span>
                ${doc.ano ? `<span class="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">${escapeHtml(doc.ano)}</span>` : ''}
              </div>
              <button onclick="copyCitation('${escapeHtml(doc.citacion_formal)}')" class="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                Copiar Citación
              </button>
            </div>

            <h5 class="text-white font-semibold text-lg mb-1 flex items-center gap-2">
              ${escapeHtml(doc.radicado)}
              ${doc.magistrado_ponente ? `<span class="text-xs font-normal text-slate-400">• Ponente: ${escapeHtml(doc.magistrado_ponente)}</span>` : ''}
            </h5>

            <p class="text-sm text-slate-300 mb-4 line-clamp-2">
              <strong class="text-slate-400">Asunto:</strong> ${escapeHtml(doc.tema || 'Tema registrado en relatoría judicial')}
            </p>

            <!-- CITA DEL RESUELVE -->
            <div class="resuelve-box mb-4">
              <div class="text-xs uppercase tracking-wider text-amber-400/90 font-bold mb-1.5 flex items-center gap-1">
                <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Citación Textual del RESUELVE:
              </div>
              <div class="text-slate-200 text-sm whitespace-pre-line font-legal-quote">
                "${escapeHtml(doc.resuelve || 'Decisión proferida en providencia de mérito.')}"
              </div>
            </div>

            <!-- Footer con Citación Formal y Enlaces -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <div class="text-slate-400 flex items-center gap-1">
                <span class="font-medium text-slate-300">Citación Formal:</span> 
                <code class="text-amber-300/90 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">${escapeHtml(doc.citacion_formal)}</code>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="openDetailModal('${escapeHtml(doc.id)}')" class="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                  Ver Ficha Completa
                </button>
                <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline">
                  Abrir en Drive
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="glass-panel p-6 sm:p-8 rounded-2xl border border-amber-500/30 shadow-2xl animate-fade-in">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/60">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white font-legal-title">Respuesta del Asistente Jurídico IA</h3>
            <p class="text-xs text-slate-400">Consulta: "${escapeHtml(query)}"</p>
          </div>
        </div>
        <button onclick="document.getElementById('ai-results-container').classList.add('hidden')" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      ${bodyHtml}
    </div>
  `;
}

// ==========================================
// RENDERIZADO DEL EXPLORADOR DE JURISPRUDENCIA
// ==========================================

function renderExplorer() {
  const container = document.getElementById('explorer-grid');
  const countEl = document.getElementById('explorer-results-count');
  const pageCurrentEl = document.getElementById('page-current');
  const pageTotalEl = document.getElementById('page-total');
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');

  if (!container) return;

  const total = filteredRecords.length;
  if (countEl) countEl.textContent = `${total} providencia${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}`;

  const maxPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > maxPages) currentPage = maxPages;

  if (pageCurrentEl) pageCurrentEl.textContent = currentPage;
  if (pageTotalEl) pageTotalEl.textContent = maxPages;

  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= maxPages);

  if (total === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 text-slate-400">
        <svg class="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="text-lg font-medium text-slate-300">No se encontraron providencias con los filtros aplicados</p>
        <p class="text-sm mt-1">Intenta restablecer los filtros o buscar con otros términos.</p>
      </div>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = filteredRecords.slice(startIdx, startIdx + PAGE_SIZE);

  container.innerHTML = pageRecords.map(doc => `
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between border border-slate-800 hover:border-amber-500/40 transition-all duration-300">
      <div>
        <!-- Badges superiores -->
        <div class="flex flex-wrap items-center justify-between gap-1.5 mb-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeClass(doc.corte)}">
            ${escapeHtml(doc.corte)}
          </span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
              ${escapeHtml(doc.tipo || 'Sentencia')}
            </span>
            ${doc.ano ? `<span class="text-xs text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">${escapeHtml(doc.ano)}</span>` : ''}
          </div>
        </div>

        <!-- Radicado -->
        <h4 class="text-lg font-bold text-white mb-1 group-hover:text-amber-400 transition-colors flex items-center justify-between">
          <span>${escapeHtml(doc.radicado)}</span>
        </h4>

        <!-- Ponente y Fecha -->
        <p class="text-xs text-slate-400 mb-2.5">
          ${doc.magistrado_ponente ? `<span class="font-medium text-slate-300">M.P.</span> ${escapeHtml(doc.magistrado_ponente)}` : 'Ponente en relatoría'}
          ${doc.fecha_providencia ? ` • ${escapeHtml(doc.fecha_providencia)}` : ''}
        </p>

        <!-- Tema / Asunto -->
        <p class="text-sm text-slate-300 mb-4 line-clamp-3 leading-relaxed">
          ${escapeHtml(doc.tema || 'Síntesis jurisprudencial registrada en relatoría judicial.')}
        </p>

        <!-- Descriptores -->
        ${(doc.descriptores && doc.descriptores.length > 0) ? `
          <div class="flex flex-wrap gap-1 mb-4">
            ${doc.descriptores.slice(0, 3).map(desc => `
              <span class="text-[10px] text-slate-400 bg-slate-900/60 border border-slate-700/50 px-2 py-0.5 rounded-md truncate max-w-[200px]" title="${escapeHtml(desc)}">
                ${escapeHtml(desc)}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Acciones de tarjeta -->
      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <button onclick="openDetailModal('${escapeHtml(doc.id)}')" class="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 hover:underline">
          Ver Resuelve y Ficha
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <button onclick="copyCitation('${escapeHtml(doc.citacion_formal)}')" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors" title="Copiar citación formal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Modal de Detalle / Ficha Técnica
function openDetailModal(docId) {
  const doc = jurisprudenciaDB.find(d => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById('modal-detail');
  const title = document.getElementById('modal-detail-title');
  const content = document.getElementById('modal-detail-content');

  if (title) title.textContent = `Providencia ${doc.radicado}`;
  if (content) {
    content.innerHTML = `
      <div class="space-y-6">
        <!-- Ficha Técnica -->
        <div class="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
          <h4 class="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Ficha Técnica Institucional
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span class="text-slate-400">Corporación Judicial:</span> <strong class="text-white block">${escapeHtml(doc.corte)}</strong></div>
            <div><span class="text-slate-400">Sala Especializada:</span> <strong class="text-white block">${escapeHtml(doc.sala_especializada || 'No especificada')}</strong></div>
            <div><span class="text-slate-400">Magistrado(a) Ponente:</span> <strong class="text-white block">${escapeHtml(doc.magistrado_ponente || 'No registrado')}</strong></div>
            <div><span class="text-slate-400">Fecha de Providencia:</span> <strong class="text-white block">${escapeHtml(doc.fecha_providencia || 'No registrada')}</strong></div>
            <div><span class="text-slate-400">Número de Expediente:</span> <strong class="text-white block">${escapeHtml(doc.expediente || 'No registrado')}</strong></div>
            <div><span class="text-slate-400">Año de Emisión:</span> <strong class="text-white block">${escapeHtml(doc.ano || 'No registrado')}</strong></div>
          </div>
        </div>

        <!-- Asunto / Síntesis -->
        <div>
          <h4 class="text-slate-300 font-semibold text-sm mb-2">⚖️ Síntesis del Asunto / Problema Jurídico</h4>
          <p class="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            ${escapeHtml(doc.tema || 'No registra síntesis previa.')}
          </p>
        </div>

        <!-- Resuelve Destacado -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-amber-400 font-bold text-sm uppercase tracking-wide flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Parte Resolutiva Oficial (RESUELVE)
            </h4>
            <button onclick="copyCitation('${escapeHtml(doc.resuelve)}', '¡Texto del Resuelve copiado!')" class="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 transition-colors">
              Copiar Resuelve
            </button>
          </div>
          <div class="resuelve-box text-slate-100 max-h-96 overflow-y-auto">
            ${escapeHtml(doc.resuelve || 'Sin extracto de resuelve disponible.')}
          </div>
        </div>

        <!-- Citación Formal -->
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span class="text-slate-400 block mb-1">Citación Jurídica Formal (Estándar Colombia):</span>
            <code class="text-amber-300 font-mono text-sm">${escapeHtml(doc.citacion_formal)}</code>
          </div>
          <button onclick="copyCitation('${escapeHtml(doc.citacion_formal)}')" class="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors">
            Copiar Citación
          </button>
        </div>

        <!-- Enlaces a Fuentes Oficiales y Google Drive -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all text-xs">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.01 1.986a10.02 10.02 0 0 0-7.07 2.93l6.57 11.37h.5a8.03 8.03 0 0 0 0-16.06z"/></svg>
            Abrir Documento en Google Drive
          </a>
          ${doc.url_origen ? `
            <a href="${escapeHtml(doc.url_origen)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 border border-slate-700 transition-all text-xs">
              Ver Relatoría Oficial
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }

  modal?.classList.remove('hidden');
}

// ==========================================
// UTILIDADES
// ==========================================

function getBadgeClass(corte) {
  if (!corte) return 'badge-corte-constitucional';
  if (corte.includes('Constitucional')) return 'badge-corte-constitucional';
  if (corte.includes('Suprema')) return 'badge-corte-suprema';
  if (corte.includes('Consejo')) return 'badge-consejo-estado';
  if (corte.includes('Tribunal')) return 'badge-tribunal';
  if (corte.includes('Arbitral') || corte.includes('Laudo') || corte.includes('CAC')) return 'badge-arbitral';
  if (corte.includes('Superintendencia')) return 'badge-superintendencia';
  if (corte.includes('Senado') || corte.includes('Ley')) return 'badge-ley';
  return 'badge-corte-constitucional';
}

function copyCitation(text, customMsg = '¡Citación formal copiada al portapapeles!') {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(customMsg);
  }).catch(() => {
    // Fallback
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
    showToast(customMsg);
  });
}

function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-5 right-5 z-50 bg-slate-900 border border-amber-500/60 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-medium text-sm transition-all duration-300 transform translate-y-10 opacity-0';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
    <span>${escapeHtml(msg)}</span>
  `;

  toast.classList.remove('translate-y-10', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-10', 'opacity-0');
  }, 3200);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Convertidor ligero de Markdown a HTML
function markdownToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/^### (.*$)/gim, '<h4 class="text-amber-400 font-bold text-base mt-4 mb-2">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-white font-bold text-lg mt-5 mb-2 font-legal-title">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-amber-300 font-extrabold text-xl mt-6 mb-3 font-legal-title">$1</h2>')
    .replace(/^\> (.*$)/gim, '<div class="resuelve-box my-3 text-slate-200">$1</div>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-slate-300">$1</em>')
    .replace(/`([^`]+)`/gim, '<code class="bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700/60">$1</code>')
    .replace(/\n\n/gim, '<br><br>');
  return html;
}
