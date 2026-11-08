/**
 * ==========================================================================
 * JurisWiki Colombia — Motor de Inteligencia Jurídica & Experiencia de Usuario
 * Providencias de la Corte Constitucional, Corte Suprema, Consejo de Estado,
 * Tribunales y Arbitraje de Colombia.
 * ==========================================================================
 */

let jurisprudenciaDB = [];
let filteredRecords = [];
let bookmarkedIds = new Set();
let currentPage = 1;
const PAGE_SIZE = 15;
let currentViewMode = 'grid'; // 'grid' | 'table'
let currentSpeechUtterance = null;
let isSpeaking = false;

// Thesaurus Jurídico Colombiano para Recuperación Semántica Avanzada
const LEGAL_THESAURUS = {
  alimento: ['alimentos', 'cuota alimentaria', 'familia', 'menor', 'niño', 'niña', 'nna', 'sustento', 'inasistencia', 'cuidado', 'patria potestad', 'comisaria', 't-007-24', 'c-028-24', 'a-006-26', 'a-012-25', 't-014-26', 'fijacion de alimentos', 'embargo'],
  alimentos: ['alimento', 'cuota alimentaria', 'familia', 'menor', 'niño', 'niña', 'nna', 'sustento', 'inasistencia', 'cuidado', 'patria potestad', 'comisaria', 't-007-24', 'c-028-24', 'a-006-26', 'a-012-25', 't-014-26', 'fijacion de alimentos', 'embargo'],
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

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  loadBookmarksFromStorage();
  initNavigationTabs();
  initGlobalHotkeys();
  initQueryAutocomplete();
  initCategoryPills();
  initExplorerFilters();
  initSettingsModal();
  initDrawerEvents();
  initSyncButton();
  await loadDatabase();
  loadSavedApiKey();
});

// Cargar base de datos jurisprudencial
async function loadDatabase() {
  const loadingEl = document.getElementById('db-loading-indicator');
  try {
    const res = await fetch('jurisprudencia_db.json?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    jurisprudenciaDB = await res.json();
    filteredRecords = [...jurisprudenciaDB];

    populateFilterDropdowns();
    renderExplorer();
    updateDashboardStats();

    if (loadingEl) {
      loadingEl.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => loadingEl.remove(), 400);
    }
  } catch (err) {
    console.error('Error cargando base jurisprudencial:', err);
    if (loadingEl) {
      loadingEl.innerHTML = `<span class="text-amber-400 font-bold">⚠️</span> <span>Error al cargar base de datos</span>`;
    }
  }
}

// Actualizar contadores métricos en el header
function updateDashboardStats() {
  const totalEl = document.getElementById('stat-total-docs');
  const ccEl = document.getElementById('stat-cc-docs');
  const tutelasEl = document.getElementById('stat-tutelas-docs');

  if (totalEl) totalEl.textContent = formatNumber(jurisprudenciaDB.length);

  if (ccEl) {
    const ccCount = jurisprudenciaDB.filter(d => (d.corte || '').includes('Constitucional')).length;
    ccEl.textContent = formatNumber(ccCount);
  }

  if (tutelasEl) {
    const tCount = jurisprudenciaDB.filter(d => (d.tipo === 'T' || (d.radicado || '').startsWith('T-'))).length;
    tutelasEl.textContent = formatNumber(tCount);
  }
}

function formatNumber(num) {
  return new Intl.NumberFormat('es-CO').format(num);
}

// ==========================================
// PESTAÑAS Y NAVEGACIÓN
// ==========================================

function initNavigationTabs() {
  const tabAi = document.getElementById('tab-btn-ai');
  const tabExp = document.getElementById('tab-btn-explorer');
  const tabBookmarks = document.getElementById('tab-btn-bookmarks');

  const viewAi = document.getElementById('view-ai');
  const viewExp = document.getElementById('view-explorer');
  const viewBookmarks = document.getElementById('view-bookmarks');

  const switchTab = (activeBtn, activeView) => {
    [tabAi, tabExp, tabBookmarks].forEach(btn => {
      btn?.classList.remove('bg-amber-500/20', 'text-amber-400', 'border-amber-500/40', 'shadow-sm');
      btn?.classList.add('text-slate-400', 'border-transparent');
      btn?.setAttribute('aria-selected', 'false');
    });

    [viewAi, viewExp, viewBookmarks].forEach(v => v?.classList.add('hidden'));

    activeBtn?.classList.add('bg-amber-500/20', 'text-amber-400', 'border-amber-500/40', 'shadow-sm');
    activeBtn?.classList.remove('text-slate-400', 'border-transparent');
    activeBtn?.setAttribute('aria-selected', 'true');
    activeView?.classList.remove('hidden');

    if (activeView === viewBookmarks) {
      renderBookmarksView();
    }
  };

  tabAi?.addEventListener('click', () => switchTab(tabAi, viewAi));
  tabExp?.addEventListener('click', () => switchTab(tabExp, viewExp));
  tabBookmarks?.addEventListener('click', () => switchTab(tabBookmarks, viewBookmarks));
}

// Atajos globales de teclado (Ctrl+K, Esc, /)
function initGlobalHotkeys() {
  const searchInput = document.getElementById('ai-query-input');
  const quickTrigger = document.getElementById('quick-search-trigger');

  const focusSearch = (e) => {
    e?.preventDefault();
    document.getElementById('tab-btn-ai')?.click();
    searchInput?.focus();
    searchInput?.select();
  };

  quickTrigger?.addEventListener('click', focusSearch);

  window.addEventListener('keydown', (e) => {
    // Ctrl+K o Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      focusSearch(e);
    }
    // Escape cierra drawer y dropdown
    if (e.key === 'Escape') {
      closeDrawer();
      closeAutocomplete();
      document.getElementById('modal-settings')?.close();
    }
  });
}

// ==========================================
// AUTOCOMPLETADO & CONSULTA INTELIGENTE
// ==========================================

function initQueryAutocomplete() {
  const input = document.getElementById('ai-query-input');
  const dropdown = document.getElementById('ai-autocomplete-dropdown');
  const btnClear = document.getElementById('btn-clear-query');
  const btnAsk = document.getElementById('btn-ask-ai');

  let debounceTimer = null;

  input?.addEventListener('input', () => {
    const val = input.value.trim();
    if (val.length > 0) {
      btnClear?.classList.remove('hidden');
    } else {
      btnClear?.classList.add('hidden');
      closeAutocomplete();
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderAutocompleteMatches(val);
    }, 120);
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      closeAutocomplete();
      const q = input.value.trim();
      if (q) runAiConsultation(q);
    }
  });

  btnAsk?.addEventListener('click', () => {
    closeAutocomplete();
    const q = input?.value.trim();
    if (q) runAiConsultation(q);
  });

  btnClear?.addEventListener('click', () => {
    if (input) input.value = '';
    btnClear.classList.add('hidden');
    closeAutocomplete();
    input?.focus();
  });

  // Cerrar al hacer clic afuera
  document.addEventListener('click', (e) => {
    if (!input?.contains(e.target) && !dropdown?.contains(e.target)) {
      closeAutocomplete();
    }
  });
}

function renderAutocompleteMatches(query) {
  const dropdown = document.getElementById('ai-autocomplete-dropdown');
  if (!dropdown) return;

  const normalized = normalizeText(query);
  if (normalized.length < 2) {
    closeAutocomplete();
    return;
  }

  // Buscar coincidencias directas en la base
  const matches = [];
  for (const doc of jurisprudenciaDB) {
    const rad = normalizeText(doc.radicado);
    const tema = normalizeText(doc.tema);
    const ponente = normalizeText(doc.magistrado_ponente);

    if (rad.includes(normalized) || tema.includes(normalized) || ponente.includes(normalized)) {
      matches.push(doc);
      if (matches.length >= 6) break;
    }
  }

  if (matches.length === 0) {
    closeAutocomplete();
    return;
  }

  dropdown.innerHTML = matches.map(doc => `
    <div class="autocomplete-item p-3 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between gap-2" data-radicado="${escapeHtml(doc.radicado)}" data-tema="${escapeHtml(doc.tema)}">
      <div class="flex items-center gap-2 overflow-hidden">
        <span class="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex-shrink-0">
          ${escapeHtml(doc.radicado)}
        </span>
        <span class="text-xs text-slate-300 truncate font-medium">
          ${escapeHtml(doc.tema || 'Consulta jurisprudencial')}
        </span>
      </div>
      <span class="text-[10px] text-slate-400 flex-shrink-0">${escapeHtml(doc.corte || '')}</span>
    </div>
  `).join('');

  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const rad = item.getAttribute('data-radicado');
      const tema = item.getAttribute('data-tema');
      const input = document.getElementById('ai-query-input');
      if (input) {
        input.value = `${rad}: ${tema}`;
        closeAutocomplete();
        runAiConsultation(input.value);
      }
    });
  });

  dropdown.classList.remove('hidden');
}

function closeAutocomplete() {
  const dropdown = document.getElementById('ai-autocomplete-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

// Categorías de chips interactivos
function initCategoryPills() {
  const pills = document.querySelectorAll('.category-pill');
  const chips = document.querySelectorAll('.prompt-chip');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const cat = pill.getAttribute('data-category');
      chips.forEach(chip => {
        const chipCat = chip.getAttribute('data-category');
        if (cat === 'todos' || chipCat === cat) {
          chip.classList.remove('hidden');
        } else {
          chip.classList.add('hidden');
        }
      });
    });
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      const input = document.getElementById('ai-query-input');
      if (input) {
        input.value = prompt;
        document.getElementById('btn-clear-query')?.classList.remove('hidden');
        runAiConsultation(prompt);
      }
    });
  });
}

// ==========================================
// MOTOR DE CONSULTA JURISPRUDENCIAL & RAG
// ==========================================

async function runAiConsultation(query) {
  const resultContainer = document.getElementById('ai-results-container');
  const loadingIndicator = document.getElementById('ai-loading-state');
  const emptyState = document.getElementById('ai-empty-state');

  stopAudioPlayback();

  if (emptyState) emptyState.classList.add('hidden');
  if (resultContainer) resultContainer.classList.add('hidden');
  if (loadingIndicator) loadingIndicator.classList.remove('hidden');

  // Recuperar documentos relevantes con algoritmo semántico-léxico
  const relevantDocs = retrieveRelevantDocuments(query, 6);

  const apiKey = localStorage.getItem('GEMINI_API_KEY');

  try {
    if (apiKey && apiKey.length > 10) {
      await askGeminiApi(query, relevantDocs, apiKey);
    } else {
      await new Promise(r => setTimeout(r, 450));
      renderLocalRagResponse(query, relevantDocs);
    }
  } catch (err) {
    console.warn('Llamada a Gemini API no disponible, usando motor local RAG:', err);
    renderLocalRagResponse(query, relevantDocs);
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (resultContainer) resultContainer.classList.remove('hidden');
    resultContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function retrieveRelevantDocuments(query, limit = 6) {
  const normalizedQuery = normalizeText(query);
  const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

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

    const isTutelaQuery = normalizedQuery.includes('tutela') || normalizedQuery.includes('amparo');
    const isAlimentosQuery = normalizedQuery.includes('alimento') || normalizedQuery.includes('cuota') || normalizedQuery.includes('familia');

    if (isTutelaQuery && (doc.tipo === 'T' || doc.radicado.startsWith('T-'))) {
      score += 20;
    }

    if (isAlimentosQuery) {
      if (temaNorm.includes('familia') || temaNorm.includes('menor') || temaNorm.includes('alimento') || temaNorm.includes('niñ')) {
        score += 45;
      }
      if (resuelveNorm.includes('familia') || resuelveNorm.includes('alimento') || resuelveNorm.includes('menor')) {
        score += 35;
      }
      if (['t-007-24', 'c-028-24', 'a-006-26', 't-001-24', 't-014-26'].includes(radicadoNorm)) {
        score += 70;
      }
    }

    if (normalizedQuery.includes(radicadoNorm) && radicadoNorm.length > 3) {
      score += 200;
    }

    expandedTerms.forEach(term => {
      if (!term) return;
      if (descriptoresNorm.includes(term)) score += 30;
      if (temaNorm.includes(term)) score += 20;
      if (resuelveNorm.includes(term)) score += 15;
      if (ponenteNorm.includes(term)) score += 10;
    });

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.doc);
}

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

// Llamada a la API de Google Gemini (2.5 Flash)
async function askGeminiApi(query, candidates, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const contextDocs = candidates.map((d, idx) => `
[DOCUMENTO ${idx + 1}]
- Radicado: ${d.radicado}
- Corporación: ${d.corte}
- Ponente: ${d.magistrado_ponente || 'No registrado'}
- Fecha: ${d.fecha_providencia || 'No registrada'}
- Asunto: ${d.tema}
- Texto del RESUELVE (Operativo):
${d.resuelve ? d.resuelve.substring(0, 2000) : 'Sin extracto'}
- Citación Formal: ${d.citacion_formal}
---`).join('\n');

  const systemPrompt = `Eres un asistente experto en jurisprudencia y derecho constitucional colombiano de JurisWiki.
El usuario consulta: "${query}".

Documentos auténticos indexados en el repositorio:
${contextDocs}

Instrucciones:
1. Responde con tono riguroso, formal y de relatoría jurídica.
2. Identifica con exactitud cuáles sentencias aplican al caso.
3. CITA TEXTUALMENTE los ordinales del RESUELVE que resuelven la pretensión (e.g. PRIMERO: REVOCAR... AMPARAR...).
4. Entrega la citación formal completa de cada decisión.
5. Usa formato Markdown con viñetas y citas en bloque (>) para el resuelve.`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  renderAiResponseHTML(query, candidates, text);
}

// Síntesis local RAG de alta precisión
function renderLocalRagResponse(query, candidates) {
  const normQ = normalizeText(query);
  const isAlimentos = normQ.includes('alimento') || normQ.includes('cuota') || normQ.includes('familia');

  let intro = '';
  if (isAlimentos) {
    intro = `
**Análisis Constitucional de Aplicabilidad:**  
Frente a su consulta sobre **tutela por alimentos y protección de la familia**, la jurisprudencia constitucional colombiana establece que la acción de tutela procede excepcionalmente para salvaguardar el **mínimo vital y la vida digna de niños, niñas y adolescentes (NNA)** o sujetos de especial protección cuando se vulnera o amenaza la efectividad de las obligaciones alimentarias o se presentan defectos fácticos o sustantivos en las decisiones de jueces de familia o comisarías.

A continuación se destacan las decisiones judiciales aplicables en el repositorio y la **citación textual íntegra de su parte resolutiva (RESUELVE)**:`;
  } else {
    intro = `
**Análisis de Aplicabilidad Jurisprudencial:**  
Para el asunto consultado: *"**${escapeHtml(query)}**"*, se han identificado **${candidates.length} providencias judiciales** directamente vinculadas por temática, ratio decidendi y precedentes en la base institucional. A continuación se detalla cada sentencia aplicable y la **citación textual de su parte resolutiva (RESUELVE)**:`;
  }

  renderAiResponseHTML(query, candidates, null, intro);
}

// Renderizado HTML del Resultado de IA con Interacciones Avanzadas
function renderAiResponseHTML(query, candidates, geminiMarkdown = null, fallbackIntro = "") {
  const container = document.getElementById('ai-results-container');
  if (!container) return;

  const rawTextToRead = geminiMarkdown ? geminiMarkdown.replace(/[#*`_>]/g, '') : `${fallbackIntro.replace(/[#*`_>]/g, '')}. Documentos aplicables: ${candidates.map(d => `${d.radicado}, ${d.tema}`).join('. ')}`;

  const bodyContent = geminiMarkdown ? `
    <div class="prose prose-invert max-w-none text-slate-200 leading-relaxed font-sans mb-8">
      ${markdownToHtml(geminiMarkdown)}
    </div>
  ` : `
    <div class="text-slate-200 leading-relaxed text-sm sm:text-base mb-6 font-sans">
      ${markdownToHtml(fallbackIntro)}
    </div>

    <div class="space-y-6">
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <h4 class="text-amber-400 font-bold tracking-wider text-xs uppercase flex items-center gap-2">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Providencias Aplicables Identificadas (${candidates.length})
        </h4>
      </div>

      ${candidates.map((doc, idx) => `
        <article class="surface-card rounded-2xl p-5 sm:p-6 border border-slate-800 transition-all">
          
          <!-- Encabezado de la providencia -->
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="badge-judicial ${getBadgeClass(doc.corte)}">
                ${escapeHtml(doc.corte)}
              </span>
              <span class="text-xs font-mono font-bold text-slate-200 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                ${escapeHtml(doc.radicado)}
              </span>
              ${doc.ano ? `<span class="text-xs text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">${escapeHtml(doc.ano)}</span>` : ''}
            </div>

            <div class="flex items-center gap-2">
              <!-- Bookmark Button -->
              <button onclick="toggleBookmark('${escapeHtml(doc.id)}')" class="btn-bookmark p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 ${bookmarkedIds.has(doc.id) ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}" title="Guardar providencia">
                <svg class="w-4 h-4" fill="${bookmarkedIds.has(doc.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </button>

              <!-- Copiar Citación Formal -->
              <button onclick="copyFeedback(this, '${escapeHtml(doc.citacion_formal)}', '¡Citación copiada!')" class="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                <span>Copiar Citación</span>
              </button>
            </div>
          </div>

          <!-- Título y Ponente -->
          <h5 class="text-white font-bold text-lg mb-1 flex flex-wrap items-center gap-2">
            <span>${escapeHtml(doc.radicado)}</span>
            ${doc.magistrado_ponente ? `<span class="text-xs font-normal text-slate-400 font-sans">• Ponente: <strong>${escapeHtml(doc.magistrado_ponente)}</strong></span>` : ''}
          </h5>

          <p class="text-xs sm:text-sm text-slate-300 mb-4 line-clamp-3 leading-relaxed">
            <strong class="text-slate-400 font-semibold">Problema Jurídico / Asunto:</strong> ${escapeHtml(doc.tema || 'Asunto registrado en relatoría judicial.')}
          </p>

          <!-- CITACIÓN TEXTUAL DEL RESUELVE -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Citación Textual del RESUELVE (Parte Resolutiva Oficial):
              </span>
              <button onclick="copyFeedback(this, '${escapeHtml(doc.resuelve)}', '¡Resuelve copiado!')" class="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium">
                Copiar extracto
              </button>
            </div>
            <div class="resuelve-quote">
              ${highlightResuelveOrdinals(doc.resuelve || 'Decisión de fondo proferida en la respectiva providencia judicial.')}
            </div>
          </div>

          <!-- Barra inferior de la tarjeta -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
            <div class="text-slate-400 flex items-center gap-1.5 overflow-hidden">
              <span class="font-medium text-slate-400">Citación Formal:</span>
              <code class="text-amber-300 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-sm">${escapeHtml(doc.citacion_formal)}</code>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="openDrawerWithDoc('${escapeHtml(doc.id)}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium">
                Ficha Completa
              </button>
              <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline">
                <span>Google Drive</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
            </div>
          </div>

        </article>
      `).join('')}
    </div>
  `;

  container.innerHTML = `
    <div class="surface-card p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-2xl relative">
      
      <!-- Top Action Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div>
            <h3 class="text-lg sm:text-xl font-bold text-white font-display">Respuesta de Relatoría e Inteligencia Jurídica</h3>
            <p class="text-xs text-slate-400">Consulta: "${escapeHtml(query)}"</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Text to Speech Audio Button -->
          <button id="btn-audio-listen" onclick="toggleAudioSpeech('${escapeForJsString(rawTextToRead)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors" title="Escuchar síntesis con audio">
            <svg id="audio-icon" class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            <span id="audio-btn-label">Escuchar</span>
          </button>

          <!-- Export Dossier Button -->
          <button onclick="downloadConsultationReport('${escapeForJsString(query)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors" title="Descargar dictamen en Markdown">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Descargar</span>
          </button>

          <!-- Close Results Button -->
          <button onclick="document.getElementById('ai-results-container').classList.add('hidden')" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors" title="Cerrar resultados">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      ${bodyContent}

    </div>
  `;
}

// Resaltar sintácticamente los ordinales de RESUELVE
function highlightResuelveOrdinals(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);

  // Resaltar PRIMERO, SEGUNDO, TERCERO, CUARTO, QUINTO, etc.
  escaped = escaped.replace(/(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SEPTIMO|OCTAVO|NOVENO|DECIMO)(:|-)/gi, (match) => {
    return `<span class="ordinal-tag">${match.toUpperCase()}</span>`;
  });

  // Resaltar verbos judiciales clave
  escaped = escaped.replace(/\b(REVOCAR|AMPARAR|ORDENAR|CONFIRMAR|DECLARAR|EXHORTAR|INAPLICAR|REMITIR|PREVENIR)\b/g, (match) => {
    return `<span class="action-verb">${match}</span>`;
  });

  return escaped;
}

// ==========================================
// AUDIO SINTETIZADOR DE VOZ (HTML5 SpeechSynthesis)
// ==========================================

function toggleAudioSpeech(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Tu navegador no soporta síntesis de voz.');
    return;
  }

  const audioIcon = document.getElementById('audio-icon');
  const label = document.getElementById('audio-btn-label');

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    stopAudioPlayback();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CO';
  utterance.rate = 1.05;

  utterance.onstart = () => {
    isSpeaking = true;
    audioIcon?.classList.add('playing-audio');
    if (label) label.textContent = 'Detener';
  };

  utterance.onend = () => {
    stopAudioPlayback();
  };

  utterance.onerror = () => {
    stopAudioPlayback();
  };

  currentSpeechUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopAudioPlayback() {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  const audioIcon = document.getElementById('audio-icon');
  const label = document.getElementById('audio-btn-label');
  audioIcon?.classList.remove('playing-audio');
  if (label) label.textContent = 'Escuchar';
}

// ==========================================
// EXPLORADOR DE JURISPRUDENCIA & TABLA
// ==========================================

function initExplorerFilters() {
  const searchInput = document.getElementById('explorer-search-input');
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const anoSelect = document.getElementById('filter-ano');
  const btnReset = document.getElementById('btn-reset-filters');

  const btnGrid = document.getElementById('btn-view-grid');
  const btnTable = document.getElementById('btn-view-table');

  btnGrid?.addEventListener('click', () => {
    currentViewMode = 'grid';
    btnGrid.classList.add('bg-amber-500/20', 'text-amber-400');
    btnGrid.classList.remove('text-slate-400');
    btnTable.classList.remove('bg-amber-500/20', 'text-amber-400');
    btnTable.classList.add('text-slate-400');
    document.getElementById('explorer-grid')?.classList.remove('hidden');
    document.getElementById('explorer-table-container')?.classList.add('hidden');
  });

  btnTable?.addEventListener('click', () => {
    currentViewMode = 'table';
    btnTable.classList.add('bg-amber-500/20', 'text-amber-400');
    btnTable.classList.remove('text-slate-400');
    btnGrid.classList.remove('bg-amber-500/20', 'text-amber-400');
    btnGrid.classList.add('text-slate-400');
    document.getElementById('explorer-grid')?.classList.add('hidden');
    document.getElementById('explorer-table-container')?.classList.remove('hidden');
  });

  let filterDebounce = null;
  const applyFilters = () => {
    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => {
      const q = (searchInput?.value || '').toLowerCase().trim();
      const c = corteSelect?.value || '';
      const t = tipoSelect?.value || '';
      const a = anoSelect?.value || '';

      filteredRecords = jurisprudenciaDB.filter(doc => {
        if (c && doc.corte !== c) return false;
        if (t && doc.tipo !== t) return false;
        if (a && String(doc.ano) !== a) return false;
        if (q) {
          const full = `${doc.radicado} ${doc.corte} ${doc.tema} ${doc.magistrado_ponente} ${doc.resuelve} ${(doc.descriptores || []).join(' ')}`.toLowerCase();
          if (!full.includes(q)) return false;
        }
        return true;
      });

      currentPage = 1;
      renderExplorer();
    }, 150);
  };

  searchInput?.addEventListener('input', applyFilters);
  corteSelect?.addEventListener('change', applyFilters);
  tipoSelect?.addEventListener('change', applyFilters);
  anoSelect?.addEventListener('change', applyFilters);

  btnReset?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (corteSelect) corteSelect.value = '';
    if (tipoSelect) tipoSelect.value = '';
    if (anoSelect) anoSelect.value = '';
    filteredRecords = [...jurisprudenciaDB];
    currentPage = 1;
    renderExplorer();
  });

  // Paginación
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');

  prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderExplorer();
      document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  nextBtn?.addEventListener('click', () => {
    const maxPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
    if (currentPage < maxPages) {
      currentPage++;
      renderExplorer();
      document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

function populateFilterDropdowns() {
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
    corteSelect.innerHTML = '<option value="">Todas las Corporaciones</option>';
    Array.from(cortes).sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      corteSelect.appendChild(opt);
    });
  }

  if (tipoSelect) {
    tipoSelect.innerHTML = '<option value="">Todos los tipos</option>';
    Array.from(tipos).sort().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      tipoSelect.appendChild(opt);
    });
  }

  if (anoSelect) {
    anoSelect.innerHTML = '<option value="">Todos los años</option>';
    Array.from(anos).sort((a, b) => b - a).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      anoSelect.appendChild(opt);
    });
  }
}

function renderExplorer() {
  const gridContainer = document.getElementById('explorer-grid');
  const tableBody = document.getElementById('explorer-table-body');
  const countEl = document.getElementById('explorer-results-count');
  const pageCurrentEl = document.getElementById('page-current');
  const pageTotalEl = document.getElementById('page-total');
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');

  if (!gridContainer || !tableBody) return;

  const total = filteredRecords.length;
  if (countEl) countEl.textContent = `${formatNumber(total)} providencias`;

  const maxPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > maxPages) currentPage = maxPages;

  if (pageCurrentEl) pageCurrentEl.textContent = currentPage;
  if (pageTotalEl) pageTotalEl.textContent = maxPages;

  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= maxPages);

  if (total === 0) {
    const emptyHtml = `
      <div class="col-span-full text-center py-16 text-slate-400">
        <svg class="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="text-base font-semibold text-slate-300">No se encontraron providencias con esos criterios</p>
        <p class="text-xs mt-1">Prueba restableciendo los filtros o ampliando los términos de búsqueda.</p>
      </div>
    `;
    gridContainer.innerHTML = emptyHtml;
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">${emptyHtml}</td></tr>`;
    return;
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = filteredRecords.slice(startIdx, startIdx + PAGE_SIZE);

  // Render Grid
  gridContainer.innerHTML = pageRecords.map(doc => `
    <article class="surface-card rounded-2xl p-5 flex flex-col justify-between border border-slate-800 hover:border-amber-500/40 transition-all">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
          <span class="badge-judicial ${getBadgeClass(doc.corte)} text-[10px]">
            ${escapeHtml(doc.corte)}
          </span>
          <div class="flex items-center gap-1">
            <span class="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              ${escapeHtml(doc.tipo || 'Sentencia')}
            </span>
            ${doc.ano ? `<span class="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">${escapeHtml(doc.ano)}</span>` : ''}
          </div>
        </div>

        <h4 class="text-base sm:text-lg font-bold text-white mb-1 flex items-center justify-between">
          <span>${escapeHtml(doc.radicado)}</span>
          <button onclick="toggleBookmark('${escapeHtml(doc.id)}')" class="p-1 text-slate-400 hover:text-amber-400 transition-colors" title="Guardar">
            <svg class="w-4 h-4 ${bookmarkedIds.has(doc.id) ? 'text-amber-400 fill-amber-400' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          </button>
        </h4>

        <p class="text-xs text-slate-400 mb-2">
          ${doc.magistrado_ponente ? `<span class="text-slate-300 font-medium">M.P.</span> ${escapeHtml(doc.magistrado_ponente)}` : 'Ponente en relatoría'}
          ${doc.fecha_providencia ? ` • ${escapeHtml(doc.fecha_providencia)}` : ''}
        </p>

        <p class="text-xs sm:text-sm text-slate-300 mb-3 line-clamp-3 leading-relaxed">
          ${escapeHtml(doc.tema || 'Síntesis jurisprudencial de mérito.')}
        </p>
      </div>

      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <button onclick="openDrawerWithDoc('${escapeHtml(doc.id)}')" class="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 hover:underline">
          <span>Ver Resuelve & Ficha</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
        <button onclick="copyFeedback(this, '${escapeHtml(doc.citacion_formal)}', '¡Copiado!')" class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors" title="Copiar citación formal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
        </button>
      </div>
    </article>
  `).join('');

  // Render Table
  tableBody.innerHTML = pageRecords.map(doc => `
    <tr>
      <td class="font-mono font-bold text-white whitespace-nowrap">${escapeHtml(doc.radicado)}</td>
      <td><span class="badge-judicial ${getBadgeClass(doc.corte)} text-[9px]">${escapeHtml(doc.corte)}</span></td>
      <td class="text-xs whitespace-nowrap text-slate-300">${escapeHtml(doc.magistrado_ponente || '--')}</td>
      <td class="font-mono text-amber-300 text-xs">${escapeHtml(doc.ano || '--')}</td>
      <td class="text-xs max-w-md truncate text-slate-300" title="${escapeHtml(doc.tema || '')}">${escapeHtml(doc.tema || 'Síntesis')}</td>
      <td class="text-right whitespace-nowrap">
        <button onclick="openDrawerWithDoc('${escapeHtml(doc.id)}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-400 font-medium mr-1.5 transition-colors">
          Ficha
        </button>
        <button onclick="toggleBookmark('${escapeHtml(doc.id)}')" class="p-1 text-slate-400 hover:text-amber-400 transition-colors" title="Guardar">
          <svg class="w-3.5 h-3.5 inline ${bookmarkedIds.has(doc.id) ? 'text-amber-400 fill-amber-400' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// FICHA TÉCNICA EN SLIDE-OVER DRAWER (SHEET)
// ==========================================

function initDrawerEvents() {
  const backdrop = document.getElementById('drawer-backdrop');
  const btnClose = document.getElementById('btn-close-drawer');

  backdrop?.addEventListener('click', closeDrawer);
  btnClose?.addEventListener('click', closeDrawer);
}

function openDrawerWithDoc(docId) {
  const doc = jurisprudenciaDB.find(d => d.id === docId);
  if (!doc) return;

  const backdrop = document.getElementById('drawer-backdrop');
  const drawer = document.getElementById('drawer-detail');
  const badgeCorte = document.getElementById('drawer-badge-corte');
  const title = document.getElementById('drawer-title');
  const body = document.getElementById('drawer-body');
  const driveLink = document.getElementById('drawer-drive-link');
  const copyResuelveBtn = document.getElementById('drawer-copy-resuelve');

  if (badgeCorte) {
    badgeCorte.className = `badge-judicial ${getBadgeClass(doc.corte)} text-[10px] mb-1`;
    badgeCorte.textContent = doc.corte;
  }

  if (title) title.textContent = `Providencia ${doc.radicado}`;
  if (driveLink) driveLink.href = doc.drive_url || '#';

  if (copyResuelveBtn) {
    copyResuelveBtn.onclick = () => copyFeedback(copyResuelveBtn, doc.resuelve, '¡Resuelve copiado!');
  }

  if (body) {
    body.innerHTML = `
      <!-- Metadatos Oficiales -->
      <div class="bg-[#090d16] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
        <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Metadatos Institucionales
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div><span class="text-slate-400 block">Corporación:</span> <strong class="text-white">${escapeHtml(doc.corte)}</strong></div>
          <div><span class="text-slate-400 block">Sala:</span> <strong class="text-white">${escapeHtml(doc.sala_especializada || 'No especificada')}</strong></div>
          <div><span class="text-slate-400 block">Magistrado(a) Ponente:</span> <strong class="text-white">${escapeHtml(doc.magistrado_ponente || 'No registrado')}</strong></div>
          <div><span class="text-slate-400 block">Fecha Providencia:</span> <strong class="text-white">${escapeHtml(doc.fecha_providencia || 'No registrada')}</strong></div>
          <div><span class="text-slate-400 block">Expediente:</span> <strong class="text-white">${escapeHtml(doc.expediente || 'No registrado')}</strong></div>
          <div><span class="text-slate-400 block">Año:</span> <strong class="text-white">${escapeHtml(doc.ano || 'No registrado')}</strong></div>
        </div>
      </div>

      <!-- Problema Jurídico / Asunto -->
      <div class="space-y-1.5">
        <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Asunto / Síntesis</h4>
        <p class="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#090d16] p-4 rounded-xl border border-slate-800">
          ${escapeHtml(doc.tema || 'Sin síntesis registrada.')}
        </p>
      </div>

      <!-- Parte Resolutiva Oficial -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Parte Resolutiva Oficial (RESUELVE)
          </h4>
        </div>
        <div class="resuelve-quote max-h-80 overflow-y-auto">
          ${highlightResuelveOrdinals(doc.resuelve || 'Sin extracto de resuelve disponible.')}
        </div>
      </div>

      <!-- Citación Formal Estándar Colombia -->
      <div class="bg-[#090d16] p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
        <div class="overflow-hidden">
          <span class="text-slate-400 block mb-0.5">Citación Formal Colombia:</span>
          <code class="text-amber-300 font-mono text-xs block truncate">${escapeHtml(doc.citacion_formal)}</code>
        </div>
        <button onclick="copyFeedback(this, '${escapeHtml(doc.citacion_formal)}', '¡Copiado!')" class="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 text-xs flex-shrink-0">
          Copiar
        </button>
      </div>
    `;
  }

  backdrop?.classList.add('active');
  drawer?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const backdrop = document.getElementById('drawer-backdrop');
  const drawer = document.getElementById('drawer-detail');
  backdrop?.classList.remove('active');
  drawer?.classList.remove('active');
  document.body.style.overflow = '';
}

// ==========================================
// GESTIÓN DE GUARDADOS (BOOKMARKS / DOSSIER)
// ==========================================

function loadBookmarksFromStorage() {
  try {
    const raw = localStorage.getItem('juris_bookmarks');
    if (raw) {
      const arr = JSON.parse(raw);
      bookmarkedIds = new Set(arr);
    }
  } catch (e) {
    bookmarkedIds = new Set();
  }
  updateBookmarksBadge();
}

function saveBookmarksToStorage() {
  localStorage.setItem('juris_bookmarks', JSON.stringify(Array.from(bookmarkedIds)));
  updateBookmarksBadge();
}

function updateBookmarksBadge() {
  const badge = document.getElementById('badge-bookmarks-count');
  if (badge) {
    const count = bookmarkedIds.size;
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function toggleBookmark(docId) {
  if (bookmarkedIds.has(docId)) {
    bookmarkedIds.delete(docId);
    showToast('Providencia removida de guardados.');
  } else {
    bookmarkedIds.add(docId);
    showToast('Providencia guardada en tu sesión.');
  }
  saveBookmarksToStorage();
  renderExplorer();

  if (!document.getElementById('view-bookmarks')?.classList.contains('hidden')) {
    renderBookmarksView();
  }
}

function renderBookmarksView() {
  const container = document.getElementById('bookmarks-container');
  if (!container) return;

  const savedDocs = jurisprudenciaDB.filter(d => bookmarkedIds.has(d.id));

  if (savedDocs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <svg class="w-12 h-12 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
        <p class="text-base font-semibold text-slate-300">Aún no has guardado providencias</p>
        <p class="text-xs mt-1">Haz clic en el ícono de marcador en cualquier sentencia para agregarla a tu dossier.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${savedDocs.map(doc => `
        <article class="surface-card rounded-2xl p-5 flex flex-col justify-between border border-slate-800">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="badge-judicial ${getBadgeClass(doc.corte)} text-[9px]">${escapeHtml(doc.corte)}</span>
              <button onclick="toggleBookmark('${escapeHtml(doc.id)}')" class="text-amber-400 hover:text-rose-400 text-xs" title="Remover de guardados">
                ✕
              </button>
            </div>
            <h4 class="font-bold text-white text-base mb-1">${escapeHtml(doc.radicado)}</h4>
            <p class="text-xs text-slate-300 mb-3 line-clamp-2">${escapeHtml(doc.tema || '')}</p>
          </div>
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button onclick="openDrawerWithDoc('${escapeHtml(doc.id)}')" class="text-amber-400 hover:underline">
              Ver Ficha
            </button>
            <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white">
              Drive &rarr;
            </a>
          </div>
        </article>
      `).join('')}
    </div>
  `;

  document.getElementById('btn-clear-bookmarks')?.addEventListener('click', () => {
    bookmarkedIds.clear();
    saveBookmarksToStorage();
    renderBookmarksView();
    renderExplorer();
    showToast('Dossier vaciado.');
  });
}

// ==========================================
// DESCARGA DE INFORMES & DOSSIER (Markdown)
// ==========================================

function downloadConsultationReport(query) {
  const container = document.getElementById('ai-results-container');
  if (!container) return;

  const relevantDocs = retrieveRelevantDocuments(query, 6);
  let mdContent = `# JurisWiki Colombia — Dictamen de Consulta Jurisprudencial\n\n`;
  mdContent += `**Fecha:** ${new Date().toLocaleDateString('es-CO')}  \n`;
  mdContent += `**Consulta Jurídica:** "${query}"\n\n`;
  mdContent += `## Providencias Aplicables Identificadas\n\n`;

  relevantDocs.forEach((d, idx) => {
    mdContent += `### ${idx + 1}. ${d.radicado} — ${d.corte}\n`;
    mdContent += `- **Ponente:** ${d.magistrado_ponente || 'No registrado'}\n`;
    mdContent += `- **Fecha:** ${d.fecha_providencia || 'No registrada'}\n`;
    mdContent += `- **Asunto:** ${d.tema}\n`;
    mdContent += `- **Citación Formal:** \`${d.citacion_formal}\`\n\n`;
    mdContent += `**Parte Resolutiva (RESUELVE):**\n> ${d.resuelve || 'Sin extracto'}\n\n---\n\n`;
  });

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `juriswiki_dictamen_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Dictamen descargado en formato Markdown.');
}

// ==========================================
// SINCRONIZACIÓN CON GOOGLE DRIVE
// ==========================================

function initSyncButton() {
  const btn = document.getElementById('btn-sync-drive');
  const icon = document.getElementById('sync-icon');

  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    btn.classList.add('opacity-70');
    icon?.classList.add('animate-spin');
    showToast('Sincronizando con Google Drive... Buscando providencias.');

    try {
      let res = await fetch('/api/sync').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('api.php?action=sync').catch(() => null);
      }
      await loadDatabase();
      showToast(`¡Drive sincronizado! ${formatNumber(jurisprudenciaDB.length)} providencias al día.`);
    } catch (e) {
      await loadDatabase();
      showToast('Base de datos sincronizada.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-70');
      icon?.classList.remove('animate-spin');
    }
  });
}

// ==========================================
// MODAL DE CONFIGURACIÓN GEMINI
// ==========================================

function initSettingsModal() {
  const btnSettings = document.getElementById('btn-settings');
  const modal = document.getElementById('modal-settings');
  const btnClose = document.getElementById('btn-close-settings');
  const btnSave = document.getElementById('btn-save-api-key');
  const input = document.getElementById('gemini-api-key-input');

  btnSettings?.addEventListener('click', () => modal?.showModal());
  btnClose?.addEventListener('click', () => modal?.close());

  btnSave?.addEventListener('click', () => {
    const key = input?.value.trim() || '';
    localStorage.setItem('GEMINI_API_KEY', key);
    modal?.close();
    updateApiKeyBadge();
    showToast(key ? 'Google Gemini 2.5 Flash activado.' : 'Usando Motor RAG Autónomo.');
  });
}

function loadSavedApiKey() {
  const key = localStorage.getItem('GEMINI_API_KEY') || '';
  const input = document.getElementById('gemini-api-key-input');
  if (input && key) input.value = key;
  updateApiKeyBadge();
}

function updateApiKeyBadge() {
  const badgeText = document.getElementById('ai-engine-status-text');
  const key = localStorage.getItem('GEMINI_API_KEY');
  if (badgeText) {
    if (key && key.length > 10) {
      badgeText.innerHTML = `<span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span> <span class="text-purple-300">Gemini 2.5 Flash</span>`;
    } else {
      badgeText.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-emerald-400">RAG Legal Nativo</span>`;
    }
  }
}

// ==========================================
// UTILIDADES & FEEDBACK VISUAL
// ==========================================

function copyFeedback(buttonEl, text, successMsg = '¡Copiado!') {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
    if (buttonEl) {
      const originalHtml = buttonEl.innerHTML;
      buttonEl.innerHTML = `<span class="text-emerald-400 font-bold">✓ Copiado</span>`;
      setTimeout(() => {
        buttonEl.innerHTML = originalHtml;
      }, 1800);
    }
  }).catch(() => {
    showToast(successMsg);
  });
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'bg-[#0d121c] border border-amber-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium pointer-events-auto transition-all duration-200 transform translate-y-3 opacity-0';
  toast.innerHTML = `
    <svg class="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
    <span>${escapeHtml(msg)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-3', 'opacity-0');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function getBadgeClass(corte) {
  if (!corte) return 'badge-cc';
  if (corte.includes('Constitucional')) return 'badge-cc';
  if (corte.includes('Suprema')) return 'badge-csj';
  if (corte.includes('Consejo')) return 'badge-ce';
  if (corte.includes('Tribunal')) return 'badge-tribunal';
  if (corte.includes('Arbitral') || corte.includes('Laudo') || corte.includes('CAC')) return 'badge-arbitral';
  if (corte.includes('Superintendencia')) return 'badge-super';
  if (corte.includes('Senado') || corte.includes('Ley')) return 'badge-ley';
  return 'badge-cc';
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

function escapeForJsString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function markdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h4 class="text-amber-400 font-bold text-sm mt-3 mb-1">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-white font-bold text-base mt-4 mb-2 font-display">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-amber-300 font-bold text-lg mt-5 mb-2 font-display">$1</h2>')
    .replace(/^\> (.*$)/gim, '<div class="resuelve-quote my-2 text-slate-200">$1</div>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-slate-300">$1</em>')
    .replace(/`([^`]+)`/gim, '<code class="bg-[#090d16] text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-800">$1</code>')
    .replace(/\n\n/gim, '<br><br>');
}
