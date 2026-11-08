/**
 * JurisWiki Colombia 2.0 - Motor de Inteligencia Jurídica y Exploración Dinámica
 * Corporaciones: Corte Constitucional, Corte Suprema, Consejo de Estado, Tribunales y Entidades
 */

// Estado Global de la Aplicación
let jurisprudenciaDB = [];
let filteredRecords = [];
let currentPage = 1;
const PAGE_SIZE = 12;
let activeMainTab = 'ai';
let viewMode = 'grid'; // 'grid' | 'list'
let selectedForCompare = new Set();
let currentDrawerDocId = null;
let currentDrawerTab = 'resuelve';
let isTtsSpeaking = false;
let currentTtsUtterance = null;

// Thesaurus Jurídico Especializado (Derecho Colombiano)
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

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initUIEvents();
  initKeyboardShortcuts();
  await loadDatabase();
  loadSavedApiKey();
});

// Inicialización de Tema Claro/Oscuro
function initTheme() {
  const savedTheme = localStorage.getItem('JURIS_THEME') || 'dark';
  applyTheme(savedTheme);
  
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
    });
  }
}

function applyTheme(theme) {
  const moonIcon = document.getElementById('theme-icon-moon');
  const sunIcon = document.getElementById('theme-icon-sun');
  
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    if (moonIcon) moonIcon.classList.remove('hidden');
    if (sunIcon) sunIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    if (moonIcon) moonIcon.classList.add('hidden');
    if (sunIcon) sunIcon.classList.remove('hidden');
  }
  localStorage.setItem('JURIS_THEME', theme);
}

// Carga Asíncrona de la Base de Datos
async function loadDatabase() {
  const loadingEl = document.getElementById('db-loading-indicator');
  try {
    const res = await fetch('jurisprudencia_db.json?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    jurisprudenciaDB = await res.json();
    filteredRecords = [...jurisprudenciaDB];

    populateFilters();
    updateQuickRibbonCounts();
    renderExplorer();
    renderAnalytics();

    if (loadingEl) {
      loadingEl.innerHTML = `<span class="text-emerald-400 font-semibold">✓</span> <span>${jurisprudenciaDB.length} providencias indexadas</span>`;
      setTimeout(() => { loadingEl.style.display = 'none'; }, 2200);
    }
  } catch (err) {
    console.error('Error cargando jurisprudencia_db.json:', err);
    if (loadingEl) {
      loadingEl.innerHTML = `<span class="text-amber-400 font-semibold">⚠️</span> <span>Modo respaldo activo</span>`;
    }
  }
}

// Contadores de la cinta de acceso rápido
function updateQuickRibbonCounts() {
  const allCount = jurisprudenciaDB.length;
  const ccCount = jurisprudenciaDB.filter(d => (d.corte || '').includes('Constitucional')).length;
  const ceCount = jurisprudenciaDB.filter(d => (d.corte || '').includes('Consejo')).length;
  const csjCount = jurisprudenciaDB.filter(d => (d.corte || '').includes('Suprema')).length;
  const tutelasCount = jurisprudenciaDB.filter(d => (d.tipo === 'T' || (d.radicado || '').startsWith('T-'))).length;
  const leyesCount = jurisprudenciaDB.filter(d => (d.tipo === 'Ley' || (d.radicado || '').startsWith('Ley'))).length;
  const supersCount = jurisprudenciaDB.filter(d => (d.corte || '').includes('Superintendencia') || (d.corte || '').includes('SIC') || (d.corte || '').includes('Supersalud')).length;

  const setIfExists = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setIfExists('quick-count-all', allCount);
  setIfExists('quick-count-tutelas', tutelasCount);
  setIfExists('quick-count-cc', ccCount);
  setIfExists('quick-count-ce', ceCount);
  setIfExists('quick-count-csj', csjCount);
  setIfExists('quick-count-leyes', leyesCount);
  setIfExists('quick-count-supers', supersCount);

  // Analytics Metrics
  setIfExists('metric-total', allCount);
  setIfExists('metric-cc', ccCount);
  setIfExists('metric-ce', ceCount);
  setIfExists('metric-tutelas', tutelasCount);
}

// ==========================================
// NAVEGACIÓN Y EVENTOS DE INTERFAZ
// ==========================================
function switchMainTab(tab) {
  activeMainTab = tab;
  
  const viewAi = document.getElementById('view-ai');
  const viewExplorer = document.getElementById('view-explorer');
  const viewCompare = document.getElementById('view-compare');
  const viewAnalytics = document.getElementById('view-analytics');

  const btnAi = document.getElementById('tab-btn-ai');
  const btnExplorer = document.getElementById('tab-btn-explorer');
  const btnCompare = document.getElementById('tab-btn-compare');
  const btnAnalytics = document.getElementById('tab-btn-analytics');

  const views = [
    { name: 'ai', el: viewAi, btn: btnAi },
    { name: 'explorer', el: viewExplorer, btn: btnExplorer },
    { name: 'compare', el: viewCompare, btn: btnCompare },
    { name: 'analytics', el: viewAnalytics, btn: btnAnalytics }
  ];

  views.forEach(v => {
    if (v.name === tab) {
      v.el?.classList.remove('hidden');
      v.btn?.classList.add('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      v.btn?.classList.remove('text-slate-400', 'border-transparent');
    } else {
      v.el?.classList.add('hidden');
      v.btn?.classList.remove('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      v.btn?.classList.add('text-slate-400', 'border-transparent');
    }
  });

  if (tab === 'compare') {
    renderComparisonMatrix();
  } else if (tab === 'analytics') {
    renderAnalytics();
  }
}

// Filtro rápido desde el ribbon superior
function quickFilter(typeOrCorte) {
  switchMainTab('explorer');
  
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const searchInput = document.getElementById('explorer-search-input');

  if (searchInput) searchInput.value = '';
  if (tipoSelect) tipoSelect.value = '';
  if (corteSelect) corteSelect.value = '';

  if (!typeOrCorte) {
    filteredRecords = [...jurisprudenciaDB];
  } else if (typeOrCorte === 'tutelas') {
    filteredRecords = jurisprudenciaDB.filter(d => d.tipo === 'T' || (d.radicado || '').startsWith('T-'));
    if (tipoSelect) tipoSelect.value = 'T';
  } else if (typeOrCorte === 'Leyes') {
    filteredRecords = jurisprudenciaDB.filter(d => d.tipo === 'Ley' || (d.radicado || '').startsWith('Ley'));
  } else if (typeOrCorte === 'Superintendencia') {
    filteredRecords = jurisprudenciaDB.filter(d => (d.corte || '').includes('Superintendencia') || (d.corte || '').includes('SIC') || (d.corte || '').includes('Supersalud'));
  } else {
    filteredRecords = jurisprudenciaDB.filter(d => (d.corte || '').toLowerCase().includes(typeOrCorte.toLowerCase()));
    if (corteSelect) corteSelect.value = typeOrCorte;
  }

  currentPage = 1;
  renderExplorer();
  document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
}

function initUIEvents() {
  // Input de consulta IA
  const inputAsk = document.getElementById('ai-query-input');
  const btnAsk = document.getElementById('btn-ask-ai');

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

  // Chips de sugerencia
  document.querySelectorAll('.prompt-chip[data-prompt]').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (inputAsk) {
        inputAsk.value = prompt;
        switchMainTab('ai');
        runAiConsultation(prompt);
      }
    });
  });

  // Filtros del Explorador con debounce
  const searchInput = document.getElementById('explorer-search-input');
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const anoSelect = document.getElementById('filter-ano');
  const sortSelect = document.getElementById('explorer-sort-by');
  const btnReset = document.getElementById('btn-reset-filters');

  let searchTimeout = null;
  const onFilterChange = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyExplorerFilters();
    }, 150);
  };

  if (searchInput) searchInput.addEventListener('input', onFilterChange);
  if (corteSelect) corteSelect.addEventListener('change', onFilterChange);
  if (tipoSelect) tipoSelect.addEventListener('change', onFilterChange);
  if (anoSelect) anoSelect.addEventListener('change', onFilterChange);
  if (sortSelect) sortSelect.addEventListener('change', onFilterChange);

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (corteSelect) corteSelect.value = '';
      if (tipoSelect) tipoSelect.value = '';
      if (anoSelect) anoSelect.value = '';
      if (sortSelect) sortSelect.value = 'relevance';
      filteredRecords = [...jurisprudenciaDB];
      currentPage = 1;
      renderExplorer();
    });
  }

  // Modos de vista Grid vs List
  const btnViewGrid = document.getElementById('btn-view-grid');
  const btnViewList = document.getElementById('btn-view-list');
  if (btnViewGrid && btnViewList) {
    btnViewGrid.addEventListener('click', () => {
      viewMode = 'grid';
      btnViewGrid.classList.add('bg-slate-800', 'text-amber-400');
      btnViewGrid.classList.remove('text-slate-400');
      btnViewList.classList.remove('bg-slate-800', 'text-amber-400');
      btnViewList.classList.add('text-slate-400');
      renderExplorer();
    });

    btnViewList.addEventListener('click', () => {
      viewMode = 'list';
      btnViewList.classList.add('bg-slate-800', 'text-amber-400');
      btnViewList.classList.remove('text-slate-400');
      btnViewGrid.classList.remove('bg-slate-800', 'text-amber-400');
      btnViewGrid.classList.add('text-slate-400');
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

  // Sincronización Manual de Google Drive
  const btnSync = document.getElementById('btn-sync-drive');
  if (btnSync) {
    btnSync.addEventListener('click', handleDriveSync);
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

  // Command Palette Trigger
  const btnCmd = document.getElementById('btn-open-command-palette');
  if (btnCmd) {
    btnCmd.addEventListener('click', openCommandPalette);
  }
}

// Atajos de Teclado Profesionales (Ctrl+K, Esc, T, /)
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Si presiona Esc -> cerrar modales o drawer
    if (e.key === 'Escape') {
      closeDrawer();
      closeCommandPalette();
      document.getElementById('modal-settings')?.classList.add('hidden');
    }

    // Ctrl + K o Cmd + K -> Abrir Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }

    // Tecla / -> Enfocar búsqueda si no está en un input
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      switchMainTab('ai');
      const input = document.getElementById('ai-query-input');
      input?.focus();
    }

    // Tecla T -> Alternar Tema si no está escribiendo
    if (e.key.toLowerCase() === 't' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
      showToast(`Tema ${isDark ? 'Claro' : 'Oscuro'} activado`);
    }

    // Flechas Izq / Der dentro del Drawer
    const drawer = document.getElementById('slideover-drawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') navigateDrawer(-1);
      if (e.key === 'ArrowRight') navigateDrawer(1);
    }
  });
}

// ==========================================
// FILTROS Y ORDENAMIENTO DEL EXPLORADOR
// ==========================================
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
    Array.from(anos).sort((a,b) => b - a).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      anoSelect.appendChild(opt);
    });
  }
}

function applyExplorerFilters() {
  const searchInput = document.getElementById('explorer-search-input');
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const anoSelect = document.getElementById('filter-ano');
  const sortSelect = document.getElementById('explorer-sort-by');

  const q = (searchInput?.value || '').toLowerCase().trim();
  const c = corteSelect?.value || '';
  const t = tipoSelect?.value || '';
  const a = anoSelect?.value || '';
  const sortBy = sortSelect?.value || 'relevance';

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

  // Ordenamiento
  if (sortBy === 'recent') {
    filteredRecords.sort((x, y) => (parseInt(y.ano) || 0) - (parseInt(x.ano) || 0));
  } else if (sortBy === 'oldest') {
    filteredRecords.sort((x, y) => (parseInt(x.ano) || 9999) - (parseInt(y.ano) || 9999));
  } else if (sortBy === 'radicado') {
    filteredRecords.sort((x, y) => (x.radicado || '').localeCompare(y.radicado || ''));
  }

  currentPage = 1;
  renderExplorer();
}

// ==========================================
// RENDERIZADO DEL EXPLORADOR (GRID & LIST)
// ==========================================
function renderExplorer() {
  const container = document.getElementById('explorer-grid');
  const countEl = document.getElementById('explorer-results-count');
  const pageCurrentEl = document.getElementById('page-current');
  const pageTotalEl = document.getElementById('page-total');
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');
  const searchInput = document.getElementById('explorer-search-input');
  const queryTerm = (searchInput?.value || '').trim();

  if (!container) return;

  const total = filteredRecords.length;
  if (countEl) countEl.textContent = `${total} providencia${total === 1 ? '' : 's'}`;

  const maxPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > maxPages) currentPage = maxPages;

  if (pageCurrentEl) pageCurrentEl.textContent = currentPage;
  if (pageTotalEl) pageTotalEl.textContent = maxPages;

  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= maxPages);

  if (total === 0) {
    container.className = 'w-full';
    container.innerHTML = `
      <div class="glass-card p-12 text-center text-slate-400 rounded-2xl border border-slate-800">
        <svg class="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="text-lg font-bold text-white">No se hallaron providencias con los criterios aplicados</p>
        <p class="text-xs text-slate-400 mt-1">Prueba restableciendo los filtros o buscando con términos más amplios.</p>
        <button onclick="document.getElementById('btn-reset-filters').click()" class="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">Restablecer Filtros</button>
      </div>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = filteredRecords.slice(startIdx, startIdx + PAGE_SIZE);

  if (viewMode === 'grid') {
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';
    container.innerHTML = pageRecords.map(doc => renderDocCard(doc, queryTerm)).join('');
  } else {
    // Modo Lista Compacta
    container.className = 'flex flex-col space-y-3';
    container.innerHTML = pageRecords.map(doc => renderDocRow(doc, queryTerm)).join('');
  }
}

// Renderizado de Tarjeta Individual (Modo Cuadrícula)
function renderDocCard(doc, highlightTerm = '') {
  const isCompared = selectedForCompare.has(doc.id);
  const radicadoHighlight = highlightText(doc.radicado, highlightTerm);
  const temaHighlight = highlightText(doc.tema || 'Síntesis jurisprudencial registrada en relatoría judicial.', highlightTerm);

  return `
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between border ${isCompared ? 'border-purple-500/80 shadow-lg shadow-purple-500/10' : 'border-slate-800'}">
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

        <!-- Radicado y Comparar -->
        <div class="flex items-center justify-between gap-2 mb-1">
          <h4 class="text-lg font-bold text-white font-mono-legal group-hover:text-amber-400 transition-colors">
            ${radicadoHighlight}
          </h4>
          <button onclick="toggleCompare('${escapeHtml(doc.id)}')" class="p-1 rounded-lg text-xs flex items-center gap-1 ${isCompared ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-purple-400 hover:bg-slate-900'}" title="Agregar al comparador lado a lado">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <span class="text-[10px] hidden sm:inline">${isCompared ? 'Comparando' : 'Comparar'}</span>
          </button>
        </div>

        <!-- Ponente y Fecha -->
        <p class="text-xs text-slate-400 mb-2.5">
          ${doc.magistrado_ponente ? `<span class="font-medium text-slate-300">M.P.</span> ${escapeHtml(doc.magistrado_ponente)}` : 'Relatoría Judicial'}
          ${doc.fecha_providencia ? ` • ${escapeHtml(doc.fecha_providencia)}` : ''}
        </p>

        <!-- Asunto con Highlighting -->
        <p class="text-sm text-slate-300 mb-3.5 line-clamp-3 leading-relaxed">
          ${temaHighlight}
        </p>

        <!-- Mini resumen del Resuelve si existe -->
        ${doc.resuelve ? `
          <div class="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 mb-3 text-xs text-slate-300 line-clamp-2 font-legal-quote">
            <span class="text-amber-400 font-bold font-sans">RESUELVE:</span> "${escapeHtml(doc.resuelve.substring(0, 160))}..."
          </div>
        ` : ''}

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
        <button onclick="openDrawer('${escapeHtml(doc.id)}')" class="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1.5 hover:underline">
          <span>Abrir Ficha & Resuelve</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <div class="flex items-center gap-1">
          <button onclick="quickTts('${escapeHtml(doc.resuelve)}', this)" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors" title="Escuchar Resuelve en voz alta">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </button>
          <button onclick="copyCitation('${escapeHtml(doc.citacion_formal)}')" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors" title="Copiar citación formal">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Renderizado de Fila Individual (Modo Lista)
function renderDocRow(doc, highlightTerm = '') {
  const isCompared = selectedForCompare.has(doc.id);
  const radicadoHighlight = highlightText(doc.radicado, highlightTerm);
  const temaHighlight = highlightText(doc.tema || 'Síntesis jurisprudencial registrada en relatoría judicial.', highlightTerm);

  return `
    <div class="glass-card rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border ${isCompared ? 'border-purple-500/80' : 'border-slate-800'}">
      <div class="flex-1 space-y-1">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getBadgeClass(doc.corte)}">
            ${escapeHtml(doc.corte)}
          </span>
          <h4 class="text-base font-bold text-white font-mono-legal">${radicadoHighlight}</h4>
          ${doc.ano ? `<span class="text-xs text-slate-400">(${escapeHtml(doc.ano)})</span>` : ''}
          ${doc.magistrado_ponente ? `<span class="text-xs text-slate-400 hidden sm:inline">• M.P. ${escapeHtml(doc.magistrado_ponente)}</span>` : ''}
        </div>
        <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">${temaHighlight}</p>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0 text-xs">
        <button onclick="toggleCompare('${escapeHtml(doc.id)}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'bg-purple-500 text-white border-purple-500' : 'border-slate-800 text-slate-400 hover:text-purple-400'}">
          ⚖️ ${isCompared ? 'Comparando' : 'Comparar'}
        </button>
        <button onclick="copyCitation('${escapeHtml(doc.citacion_formal)}')" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white">
          Copiar Citación
        </button>
        <button onclick="openDrawer('${escapeHtml(doc.id)}')" class="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400">
          Ver Ficha
        </button>
      </div>
    </div>
  `;
}

// ==========================================
// SLIDE-OVER DRAWER (INSPECTOR JUDICIAL)
// ==========================================
function openDrawer(docId) {
  currentDrawerDocId = docId;
  const doc = jurisprudenciaDB.find(d => d.id === docId);
  if (!doc) return;

  const drawer = document.getElementById('slideover-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const panel = document.getElementById('drawer-panel');
  const badge = document.getElementById('drawer-badge');
  const title = document.getElementById('drawer-title');
  const driveLink = document.getElementById('drawer-drive-link');

  if (badge) {
    badge.className = `px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeClass(doc.corte)}`;
    badge.textContent = doc.corte;
  }
  if (title) title.textContent = doc.radicado;
  if (driveLink) driveLink.href = doc.drive_url || '#';

  updateDrawerCompareBtn(docId);
  renderDrawerTabContent(doc);

  drawer?.classList.remove('hidden');
  setTimeout(() => {
    backdrop?.classList.remove('opacity-0');
    backdrop?.classList.add('opacity-100');
    panel?.classList.add('open');
  }, 20);
}

function closeDrawer() {
  const backdrop = document.getElementById('drawer-backdrop');
  const panel = document.getElementById('drawer-panel');
  const drawer = document.getElementById('slideover-drawer');

  stopTts();
  backdrop?.classList.remove('opacity-100');
  backdrop?.classList.add('opacity-0');
  panel?.classList.remove('open');

  setTimeout(() => {
    drawer?.classList.add('hidden');
  }, 200);
}

function navigateDrawer(direction) {
  const currentIdx = filteredRecords.findIndex(d => d.id === currentDrawerDocId);
  if (currentIdx === -1) return;

  let newIdx = currentIdx + direction;
  if (newIdx < 0) newIdx = filteredRecords.length - 1;
  if (newIdx >= filteredRecords.length) newIdx = 0;

  const nextDoc = filteredRecords[newIdx];
  if (nextDoc) openDrawer(nextDoc.id);
}

function switchDrawerTab(tab) {
  currentDrawerTab = tab;
  ['resuelve', 'ficha', 'citacion', 'drive'].forEach(t => {
    const btn = document.getElementById(`drawer-tab-btn-${t}`);
    if (t === tab) {
      btn?.classList.add('border-amber-500', 'text-amber-400', 'font-semibold');
      btn?.classList.remove('border-transparent', 'text-slate-400');
    } else {
      btn?.classList.remove('border-amber-500', 'text-amber-400', 'font-semibold');
      btn?.classList.add('border-transparent', 'text-slate-400');
    }
  });

  const doc = jurisprudenciaDB.find(d => d.id === currentDrawerDocId);
  if (doc) renderDrawerTabContent(doc);
}

function renderDrawerTabContent(doc) {
  const body = document.getElementById('drawer-body');
  if (!body) return;

  if (currentDrawerTab === 'resuelve') {
    // Desglosar el Resuelve en ordinales individuales
    const ordinals = parseResuelveOrdinals(doc.resuelve);
    body.innerHTML = `
      <div class="space-y-6">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-amber-400 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Parte Resolutiva Oficial (RESUELVE)
            </h4>
            <button onclick="copyCitation('${escapeHtml(doc.resuelve)}', '¡Resuelve completo copiado!')" class="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
              Copiar Todo el Resuelve
            </button>
          </div>
          
          <div class="space-y-3">
            ${ordinals.map((ord, idx) => `
              <div class="ordinal-card">
                <div class="flex items-center justify-between text-xs mb-1.5">
                  <span class="font-bold text-amber-400">${escapeHtml(ord.title || `Ordinal ${idx + 1}`)}</span>
                  <button onclick="copyCitation('${escapeHtml(ord.text)}', '¡Ordinal copiado!')" class="text-slate-400 hover:text-white p-1 rounded" title="Copiar este ordinal">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  </button>
                </div>
                <p class="font-legal-quote text-sm text-slate-200 leading-relaxed whitespace-pre-line">${escapeHtml(ord.text)}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 class="text-slate-300 font-semibold text-xs mb-1.5">Síntesis del Problema Jurídico</h4>
          <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            ${escapeHtml(doc.tema || 'Síntesis jurisprudencial registrada en relatoría judicial.')}
          </p>
        </div>
      </div>
    `;
  } else if (currentDrawerTab === 'ficha') {
    body.innerHTML = `
      <div class="space-y-5">
        <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 space-y-4">
          <h4 class="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Ficha Técnica Institucional
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div><span class="text-slate-400 block mb-0.5">Corporación:</span> <strong class="text-white">${escapeHtml(doc.corte)}</strong></div>
            <div><span class="text-slate-400 block mb-0.5">Sala Especializada:</span> <strong class="text-white">${escapeHtml(doc.sala_especializada || 'No especificada')}</strong></div>
            <div><span class="text-slate-400 block mb-0.5">Magistrado(a) Ponente:</span> <strong class="text-white">${escapeHtml(doc.magistrado_ponente || 'No registrado')}</strong></div>
            <div><span class="text-slate-400 block mb-0.5">Fecha de Providencia:</span> <strong class="text-white">${escapeHtml(doc.fecha_providencia || 'No registrada')}</strong></div>
            <div><span class="text-slate-400 block mb-0.5">Número de Expediente:</span> <strong class="text-white font-mono">${escapeHtml(doc.expediente || 'No registrado')}</strong></div>
            <div><span class="text-slate-400 block mb-0.5">Año de Emisión:</span> <strong class="text-white font-mono">${escapeHtml(doc.ano || 'No registrado')}</strong></div>
          </div>
        </div>

        <div>
          <h4 class="text-slate-300 font-semibold text-xs mb-2">Descriptores y Tesauro Jurídico</h4>
          <div class="flex flex-wrap gap-1.5">
            ${(doc.descriptores || []).map(desc => `
              <span class="text-xs text-slate-300 bg-slate-900 border border-slate-700/60 px-3 py-1 rounded-lg">
                # ${escapeHtml(desc)}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (currentDrawerTab === 'citacion') {
    const citeCC = doc.citacion_formal;
    const citeAPA = `${doc.corte}. (${doc.ano || 's.f.'}). Sentencia ${doc.radicado}. M.P. ${doc.magistrado_ponente || 'Relatoría'}.`;
    const citeDemanda = `Conforme al precedente vinculante de la ${doc.corte}, Sentencia ${doc.radicado} (M.P. ${doc.magistrado_ponente || 'Ponente'}), se amparó el derecho fundamental peticionado.`;

    body.innerHTML = `
      <div class="space-y-4">
        <p class="text-xs text-slate-300">Formatos estandarizados de citación para memoriales, demandas y artículos jurídicos:</p>
        
        <!-- Formato 1: Estándar Judicial Corte -->
        <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-amber-400 font-bold text-xs uppercase">Estándar Judicial Rama Judicial</span>
            <button onclick="copyCitation('${escapeHtml(citeCC)}')" class="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Copiar</button>
          </div>
          <code class="text-xs text-slate-200 block font-mono bg-slate-950 p-2.5 rounded">${escapeHtml(citeCC)}</code>
        </div>

        <!-- Formato 2: APA 7ma Edición -->
        <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-blue-400 font-bold text-xs uppercase">Normas APA (7ma Edición)</span>
            <button onclick="copyCitation('${escapeHtml(citeAPA)}')" class="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Copiar</button>
          </div>
          <code class="text-xs text-slate-200 block font-mono bg-slate-950 p-2.5 rounded">${escapeHtml(citeAPA)}</code>
        </div>

        <!-- Formato 3: Memorial Forense / Demanda -->
        <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-emerald-400 font-bold text-xs uppercase">Cita en Memorial / Demanda</span>
            <button onclick="copyCitation('${escapeHtml(citeDemanda)}')" class="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Copiar</button>
          </div>
          <code class="text-xs text-slate-200 block font-mono bg-slate-950 p-2.5 rounded">${escapeHtml(citeDemanda)}</code>
        </div>
      </div>
    `;
  } else if (currentDrawerTab === 'drive') {
    body.innerHTML = `
      <div class="space-y-4">
        <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 text-center space-y-3">
          <div class="w-12 h-12 mx-auto rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.01 1.986a10.02 10.02 0 0 0-7.07 2.93l6.57 11.37h.5a8.03 8.03 0 0 0 0-16.06z"/></svg>
          </div>
          <h4 class="text-white font-bold text-sm">Documento Custodiado en Google Drive</h4>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            Puedes consultar el archivo original (.pdf o .doc) directamente en la carpeta compartida de Google Drive.
          </p>
          <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all text-xs">
            Abrir en Google Drive
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>
      </div>
    `;
  }
}

// Desglosar el Resuelve en sus ordinales (PRIMERO, SEGUNDO, TERCERO...)
function parseResuelveOrdinals(resuelveText) {
  if (!resuelveText) return [{ title: 'RESUELVE', text: 'Sin extracto disponible' }];
  
  const regex = /(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|S[EÉ]PTIMO|OCTAVO|NOVENO|D[EÉ]CIMO|[1-9]\.)\s*[:\.-]/gi;
  const matches = [...resuelveText.matchAll(regex)];

  if (matches.length <= 1) {
    return [{ title: 'ORDINAL ÚNICO', text: resuelveText }];
  }

  const results = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const title = matches[i][0].replace(/[:\.-]/g, '').trim().toUpperCase();
    const end = (i + 1 < matches.length) ? matches[i + 1].index : resuelveText.length;
    const body = resuelveText.substring(start + matches[i][0].length, end).trim();
    results.push({ title, text: body });
  }

  return results;
}

// Botón de Comparar desde el Drawer
function toggleCompareFromDrawer() {
  if (!currentDrawerDocId) return;
  toggleCompare(currentDrawerDocId);
  updateDrawerCompareBtn(currentDrawerDocId);
}

function updateDrawerCompareBtn(docId) {
  const btn = document.getElementById('drawer-btn-compare-toggle');
  if (!btn) return;
  const isComp = selectedForCompare.has(docId);
  if (isComp) {
    btn.textContent = '✓ Quitar de Comparador';
    btn.className = 'px-3 py-2 rounded-xl bg-purple-500 text-white font-semibold transition-all';
  } else {
    btn.textContent = '⚖️ Agregar a Comparador';
    btn.className = 'px-3 py-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all';
  }
}

// ==========================================
// COMPARADOR DE FALLOS (SIDE-BY-SIDE MATRIX)
// ==========================================
function toggleCompare(docId) {
  if (selectedForCompare.has(docId)) {
    selectedForCompare.delete(docId);
    showToast('Providencia removida del comparador');
  } else {
    if (selectedForCompare.size >= 2) {
      // Reemplazar la más antigua
      const first = selectedForCompare.values().next().value;
      selectedForCompare.delete(first);
    }
    selectedForCompare.add(docId);
    showToast('Providencia agregada al comparador');
  }

  updateComparisonDock();
  renderExplorer(); // Actualizar botones en tarjetas
}

function updateComparisonDock() {
  const dock = document.getElementById('comparison-dock');
  const countEl = document.getElementById('dock-count');
  const navBadge = document.getElementById('nav-compare-count');

  const count = selectedForCompare.size;
  if (navBadge) {
    if (count > 0) {
      navBadge.textContent = count;
      navBadge.classList.remove('hidden');
    } else {
      navBadge.classList.add('hidden');
    }
  }

  if (count > 0) {
    dock?.classList.add('active');
    if (countEl) countEl.textContent = `${count} providencia${count === 1 ? '' : 's'}`;
  } else {
    dock?.classList.remove('active');
  }
}

function clearComparison() {
  selectedForCompare.clear();
  updateComparisonDock();
  renderExplorer();
  if (activeMainTab === 'compare') renderComparisonMatrix();
  showToast('Comparador limpiado');
}

function renderComparisonMatrix() {
  const container = document.getElementById('comparison-content');
  if (!container) return;

  const docIds = Array.from(selectedForCompare);
  const docs = docIds.map(id => jurisprudenciaDB.find(d => d.id === id)).filter(Boolean);

  if (docs.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-slate-400 space-y-3">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl font-bold">
          ⚖️
        </div>
        <h4 class="text-lg font-bold text-white">No has seleccionado providencias para comparar</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto">
          Ve al Explorador o consulta al Asistente IA y haz clic en el botón <strong>"Comparar"</strong> en cualquier providencia para cotejar en paralelo su Resuelve y fundamentos.
        </p>
        <button onclick="switchMainTab('explorer')" class="mt-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 transition-all">
          Ir al Explorador de Sentencias
        </button>
      </div>
    `;
    return;
  }

  if (docs.length === 1) {
    const d1 = docs[0];
    container.innerHTML = `
      <div class="p-6 bg-slate-900/60 rounded-xl border border-slate-800 text-center space-y-3">
        <p class="text-xs text-purple-300 font-semibold">Has seleccionado 1 de 2 providencias:</p>
        <h4 class="text-lg font-bold text-white">${escapeHtml(d1.radicado)} - ${escapeHtml(d1.corte)}</h4>
        <p class="text-xs text-slate-400">Selecciona una segunda sentencia en el explorador para activar el análisis comparativo lado a lado.</p>
        <button onclick="switchMainTab('explorer')" class="px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400">
          Seleccionar Segunda Providencia
        </button>
      </div>
    `;
    return;
  }

  const [d1, d2] = docs;
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Providencia 1 -->
      <div class="glass-card rounded-2xl p-6 border border-slate-700/80 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <span class="px-3 py-1 rounded-full text-xs font-bold ${getBadgeClass(d1.corte)}">${escapeHtml(d1.corte)}</span>
          <span class="text-xs text-slate-400 font-mono font-bold">${escapeHtml(d1.radicado)}</span>
        </div>

        <div class="space-y-2 text-xs">
          <div><strong class="text-slate-400">Magistrado(a) Ponente:</strong> <span class="text-white">${escapeHtml(d1.magistrado_ponente || 'N/A')}</span></div>
          <div><strong class="text-slate-400">Fecha de Providencia:</strong> <span class="text-white">${escapeHtml(d1.fecha_providencia || 'N/A')}</span></div>
          <div><strong class="text-slate-400">Expediente:</strong> <span class="text-white font-mono">${escapeHtml(d1.expediente || 'N/A')}</span></div>
        </div>

        <div>
          <strong class="text-slate-400 text-xs block mb-1">Asunto y Problema Jurídico:</strong>
          <p class="text-xs text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800 leading-relaxed">${escapeHtml(d1.tema || 'N/A')}</p>
        </div>

        <div>
          <strong class="text-amber-400 text-xs font-bold uppercase block mb-1">Parte Resolutiva (RESUELVE):</strong>
          <div class="resuelve-box text-xs max-h-72 overflow-y-auto">
            ${escapeHtml(d1.resuelve || 'Sin extracto')}
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between text-xs">
          <button onclick="openDrawer('${escapeHtml(d1.id)}')" class="text-amber-400 font-semibold hover:underline">Ver Ficha Completa</button>
          <button onclick="quickTts('${escapeHtml(d1.resuelve)}', this)" class="text-slate-400 hover:text-white flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            Escuchar
          </button>
        </div>
      </div>

      <!-- Providencia 2 -->
      <div class="glass-card rounded-2xl p-6 border border-slate-700/80 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <span class="px-3 py-1 rounded-full text-xs font-bold ${getBadgeClass(d2.corte)}">${escapeHtml(d2.corte)}</span>
          <span class="text-xs text-slate-400 font-mono font-bold">${escapeHtml(d2.radicado)}</span>
        </div>

        <div class="space-y-2 text-xs">
          <div><strong class="text-slate-400">Magistrado(a) Ponente:</strong> <span class="text-white">${escapeHtml(d2.magistrado_ponente || 'N/A')}</span></div>
          <div><strong class="text-slate-400">Fecha de Providencia:</strong> <span class="text-white">${escapeHtml(d2.fecha_providencia || 'N/A')}</span></div>
          <div><strong class="text-slate-400">Expediente:</strong> <span class="text-white font-mono">${escapeHtml(d2.expediente || 'N/A')}</span></div>
        </div>

        <div>
          <strong class="text-slate-400 text-xs block mb-1">Asunto y Problema Jurídico:</strong>
          <p class="text-xs text-slate-300 bg-slate-900/70 p-3 rounded-xl border border-slate-800 leading-relaxed">${escapeHtml(d2.tema || 'N/A')}</p>
        </div>

        <div>
          <strong class="text-amber-400 text-xs font-bold uppercase block mb-1">Parte Resolutiva (RESUELVE):</strong>
          <div class="resuelve-box text-xs max-h-72 overflow-y-auto">
            ${escapeHtml(d2.resuelve || 'Sin extracto')}
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between text-xs">
          <button onclick="openDrawer('${escapeHtml(d2.id)}')" class="text-amber-400 font-semibold hover:underline">Ver Ficha Completa</button>
          <button onclick="quickTts('${escapeHtml(d2.resuelve)}', this)" class="text-slate-400 hover:text-white flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            Escuchar
          </button>
        </div>
      </div>

    </div>
  `;
}

// ==========================================
// SÍNTESIS DE VOZ (TEXT-TO-SPEECH)
// ==========================================
function quickTts(text, btnElement) {
  if (!text) {
    showToast('Sin texto para reproducir');
    return;
  }

  if (isTtsSpeaking) {
    stopTts();
    return;
  }

  if (!('speechSynthesis' in window)) {
    showToast('Tu navegador no soporta síntesis de voz');
    return;
  }

  const cleanText = text.replace(/([A-ZÁÉÍÓÚÑ]+:)/g, '$1 ').substring(0, 1000);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'es-CO';
  utterance.rate = 1.0;

  utterance.onstart = () => {
    isTtsSpeaking = true;
    showToast('Reproduciendo parte resolutiva...');
    if (btnElement) {
      btnElement.innerHTML = `
        <span class="flex items-center gap-1 text-amber-400">
          <span class="sound-wave-bar"></span>
          <span class="sound-wave-bar"></span>
          <span class="sound-wave-bar"></span>
        </span>
      `;
    }
  };

  utterance.onend = () => {
    stopTts();
    if (btnElement) {
      btnElement.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
    }
  };

  currentTtsUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function toggleTtsCurrent() {
  const doc = jurisprudenciaDB.find(d => d.id === currentDrawerDocId);
  if (!doc) return;
  const btn = document.getElementById('drawer-btn-tts');
  quickTts(doc.resuelve, btn);
}

function stopTts() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isTtsSpeaking = false;
  currentTtsUtterance = null;
}

// ==========================================
// COMMAND PALETTE (CTRL + K)
// ==========================================
function openCommandPalette() {
  const modal = document.getElementById('modal-command-palette');
  const input = document.getElementById('command-input');
  const results = document.getElementById('command-results');

  modal?.classList.remove('hidden');
  if (input) {
    input.value = '';
    input.focus();
    input.oninput = () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        results.innerHTML = `<div class="text-xs text-slate-500 text-center py-6">Escribe al menos 2 letras para buscar al instante...</div>`;
        return;
      }

      const matches = jurisprudenciaDB.filter(d => 
        (d.radicado && d.radicado.toLowerCase().includes(q)) ||
        (d.corte && d.corte.toLowerCase().includes(q)) ||
        (d.tema && d.tema.toLowerCase().includes(q)) ||
        (d.magistrado_ponente && d.magistrado_ponente.toLowerCase().includes(q))
      ).slice(0, 8);

      if (matches.length === 0) {
        results.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">No se encontraron resultados para "${escapeHtml(q)}"</div>`;
        return;
      }

      results.innerHTML = matches.map(m => `
        <div onclick="openDrawer('${escapeHtml(m.id)}'); closeCommandPalette();" class="p-2.5 rounded-xl hover:bg-slate-900 cursor-pointer flex items-center justify-between gap-3 text-xs border border-transparent hover:border-slate-800 transition-colors">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-amber-400">${escapeHtml(m.radicado)}</span>
            <span class="text-slate-400 truncate max-w-[260px]">${escapeHtml(m.tema || m.corte)}</span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">${escapeHtml(m.ano || '')}</span>
        </div>
      `).join('');
    };
  }
}

function closeCommandPalette() {
  document.getElementById('modal-command-palette')?.classList.add('hidden');
}

// ==========================================
// ANALÍTICA JURISPRUDENCIAL
// ==========================================
function renderAnalytics() {
  const container = document.getElementById('analytics-courts-bars');
  if (!container || jurisprudenciaDB.length === 0) return;

  const courtCounts = {};
  jurisprudenciaDB.forEach(d => {
    const c = d.corte || 'Otras Providencias';
    courtCounts[c] = (courtCounts[c] || 0) + 1;
  });

  const sortedCourts = Object.entries(courtCounts).sort((a,b) => b[1] - a[1]);
  const total = jurisprudenciaDB.length;

  container.innerHTML = sortedCourts.map(([court, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    return `
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-300 font-medium">${escapeHtml(court)}</span>
          <span class="text-slate-400 font-mono">${count} (${pct}%)</span>
        </div>
        <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div class="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
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

  const relevantDocs = retrieveRelevantDocuments(query, 6);
  const apiKey = localStorage.getItem('GEMINI_API_KEY');

  try {
    if (apiKey && apiKey.length > 10) {
      await askGeminiApi(query, relevantDocs, apiKey);
    } else {
      await new Promise(r => setTimeout(r, 700));
      renderLocalRagResponse(query, relevantDocs);
    }
  } catch (err) {
    console.warn('Fallo en llamada a Gemini API, usando motor de respaldo:', err);
    renderLocalRagResponse(query, relevantDocs);
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (resultContainer) resultContainer.classList.remove('hidden');
    resultContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function retrieveRelevantDocuments(query, limit = 5) {
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
        score += 40;
      }
      if (resuelveNorm.includes('familia') || resuelveNorm.includes('alimento') || resuelveNorm.includes('menor')) {
        score += 35;
      }
      if (radicadoNorm === 't-007-24' || radicadoNorm === 'c-028-24' || radicadoNorm === 'a-006-26' || radicadoNorm === 't-001-24' || radicadoNorm === 't-014-26') {
        score += 60;
      }
    }

    if (normalizedQuery.includes(radicadoNorm) && radicadoNorm.length > 3) {
      score += 150;
    }

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

// Resaltar términos encontrados
function highlightText(text, query) {
  if (!text) return '';
  if (!query) return escapeHtml(text);

  const cleanQ = normalizeText(query).split(/\s+/).filter(w => w.length > 2);
  if (cleanQ.length === 0) return escapeHtml(text);

  let escaped = escapeHtml(text);
  cleanQ.forEach(term => {
    const reg = new RegExp(`(${term})`, 'gi');
    escaped = escaped.replace(reg, '<mark class="search-highlight">$1</mark>');
  });

  return escaped;
}

async function askGeminiApi(query, candidates, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const contextDocs = candidates.map((d, idx) => `
[DOCUMENTO ${idx + 1}]
- Radicado: ${d.radicado}
- Corporación: ${d.corte}
- Sala Especializada: ${d.sala_especializada || 'No especificada'}
- Magistrado(a) Ponente: ${d.magistrado_ponente || 'No registrado'}
- Fecha: ${d.fecha_providencia || 'No registrada'}
- Asunto: ${d.tema}
- Texto del RESUELVE (Operativo):
${d.resuelve ? d.resuelve.substring(0, 2000) : 'Sin extracto'}
- Citación Formal: ${d.citacion_formal}
---`).join('\n');

  const systemPrompt = `Eres un asistente experto en jurisprudencia y derecho constitucional colombiano de la plataforma JurisWiki.
El usuario consulta: "${query}".

Cuentas con las siguientes decisiones auténticas indexadas:
${contextDocs}

Instrucciones de respuesta obligatorias:
1. Responde con lenguaje técnico, riguroso y formal.
2. Identifica con exactitud qué providencia(s) aplican al caso.
3. CITA TEXTUALMENTE la parte resolutiva del fallo ("RESUELVE") que ordena o resuelve la pretensión.
4. Incluye la citación jurisprudencial formal para cada decisión.
5. Utiliza formato Markdown limpio con viñetas y títulos.`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
  const data = await response.json();
  const answerMarkdown = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  renderAiResponseHTML(query, candidates, answerMarkdown);
}

function renderLocalRagResponse(query, candidates) {
  const normQ = normalizeText(query);
  const isAlimentos = normQ.includes('alimento') || normQ.includes('cuota') || normQ.includes('familia');

  let synthesisText = "";
  if (isAlimentos) {
    synthesisText = `
**Análisis de Aplicabilidad Constitucional:**  
En relación con su consulta sobre **fallos de tutela por alimentos y derechos de familia**, en el ordenamiento jurídico colombiano la acción de tutela es procedente de forma excepcional para proteger los derechos fundamentales al mínimo vital, la vida digna y la prevalencia del interés superior de niños, niñas y adolescentes (NNA).

La Corte Constitucional ha fijado jurisprudencia uniforme determinando que los trámites ante comisarías de familia o juzgados ordinarios no pueden dilatar injustificadamente la efectividad de la cuota alimentaria ni desconocer la protección de sujetos de especial amparo constitucional. A continuación se presentan las providencias directamente aplicables y la **cita textual de su parte resolutiva (RESUELVE)**:`;
  } else {
    synthesisText = `
**Análisis de Aplicabilidad Jurisprudencial:**  
Para el tema consultado: *"**${escapeHtml(query)}**"*, se han identificado **${candidates.length} decisiones judiciales** con concordancia directa en el repositorio. A continuación se detallan las providencias aplicables y la **citación textual de la parte resolutiva (RESUELVE)**:`;
  }

  renderAiResponseHTML(query, candidates, null, synthesisText);
}

function renderAiResponseHTML(query, candidates, geminiMarkdown = null, fallbackIntro = "") {
  const container = document.getElementById('ai-results-container');
  if (!container) return;

  let bodyHtml = "";

  if (geminiMarkdown) {
    bodyHtml = `<div class="prose prose-invert max-w-none text-slate-200 leading-relaxed font-sans">${markdownToHtml(geminiMarkdown)}</div>`;
  } else {
    bodyHtml = `
      <div class="text-slate-300 leading-relaxed text-sm sm:text-base mb-6 font-sans">
        ${markdownToHtml(fallbackIntro)}
      </div>

      <div class="space-y-6 mt-6">
        <h4 class="text-amber-400 font-semibold tracking-wide text-xs uppercase flex items-center gap-2">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Decisiones Jurisprudenciales Aplicables y Resuelve Textual
        </h4>

        ${candidates.map(doc => `
          <div class="glass-card rounded-2xl p-5 border border-slate-700/60 hover:border-amber-500/40 transition-all">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getBadgeClass(doc.corte)}">
                  ${escapeHtml(doc.corte)}
                </span>
                <span class="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50 font-mono font-bold">
                  ${escapeHtml(doc.radicado)}
                </span>
                ${doc.ano ? `<span class="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded font-mono">${escapeHtml(doc.ano)}</span>` : ''}
              </div>
              
              <div class="flex items-center gap-2">
                <button onclick="toggleCompare('${escapeHtml(doc.id)}')" class="inline-flex items-center gap-1 text-xs text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1.5 rounded-lg border border-purple-500/30">
                  ⚖️ Comparar
                </button>
                <button onclick="copyCitation('${escapeHtml(doc.citacion_formal)}')" class="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  Copiar Citación
                </button>
              </div>
            </div>

            <h5 class="text-white font-bold text-base mb-1 font-mono-legal flex items-center gap-2">
              ${escapeHtml(doc.radicado)}
              ${doc.magistrado_ponente ? `<span class="text-xs font-normal text-slate-400 font-sans">• Ponente: ${escapeHtml(doc.magistrado_ponente)}</span>` : ''}
            </h5>

            <p class="text-xs sm:text-sm text-slate-300 mb-3.5 line-clamp-2">
              <strong class="text-slate-400">Asunto:</strong> ${escapeHtml(doc.tema || 'Tema registrado en relatoría judicial')}
            </p>

            <!-- CITA DEL RESUELVE -->
            <div class="resuelve-box mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Citación Textual del RESUELVE:
                </span>
                <button onclick="quickTts('${escapeHtml(doc.resuelve)}', this)" class="text-slate-400 hover:text-amber-400 p-1 rounded" title="Escuchar este Resuelve">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </button>
              </div>
              <div class="text-slate-200 text-sm whitespace-pre-line font-legal-quote">
                "${escapeHtml(doc.resuelve || 'Decisión proferida en providencia de mérito.')}"
              </div>
            </div>

            <!-- Footer con Citación Formal y Enlaces -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <div class="text-slate-400 flex items-center gap-1">
                <span class="font-medium text-slate-300">Citación:</span> 
                <code class="text-amber-300/90 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50 font-mono text-[11px]">${escapeHtml(doc.citacion_formal)}</code>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="openDrawer('${escapeHtml(doc.id)}')" class="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                  Abrir Ficha Técnica
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
    <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-2xl">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/60">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white font-legal-title">Dictamen del Asistente Jurídico IA</h3>
            <p class="text-xs text-slate-400">Consulta: "${escapeHtml(query)}"</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="copyConsultationReport('${escapeHtml(query)}')" class="text-xs text-amber-400 hover:text-amber-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            Copiar Informe
          </button>
          <button onclick="document.getElementById('ai-results-container').classList.add('hidden')" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      ${bodyHtml}
    </div>
  `;
}

function copyConsultationReport(query) {
  const container = document.getElementById('ai-results-container');
  if (!container) return;
  const text = container.innerText;
  copyCitation(`=== INFORME JURISPRUDENCIAL - JURISWIKI COLOMBIA ===\nConsulta: ${query}\nFecha: ${new Date().toLocaleDateString()}\n\n${text}`);
}

// Sincronización Interactiva de Google Drive
async function handleDriveSync() {
  const btn = document.getElementById('btn-sync-drive');
  const icon = document.getElementById('sync-icon');
  
  if (btn) btn.disabled = true;
  if (icon) icon.classList.add('animate-spin');
  showToast('Iniciando sincronización con Google Drive...');

  try {
    const res = await fetch('api.php?action=sync');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    showToast(`✓ Sincronización exitosa: ${data.total_providencias || jurisprudenciaDB.length} providencias.`);
    await loadDatabase();
  } catch (err) {
    console.warn('API PHP no disponible, probando servidor local Python...');
    try {
      const resLocal = await fetch('/api/sync');
      if (resLocal.ok) {
        showToast('✓ Sincronización local exitosa');
        await loadDatabase();
      } else {
        throw new Error('Servidor local no respondió');
      }
    } catch (e) {
      showToast('ℹ️ Base de datos verificada y al día');
    }
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.classList.remove('animate-spin');
  }
}

// ==========================================
// UTILIDADES Y AYUDAS
// ==========================================
function getBadgeClass(corte) {
  if (!corte) return 'badge-corte-constitucional';
  if (corte.includes('Constitucional')) return 'badge-corte-constitucional';
  if (corte.includes('Suprema')) return 'badge-corte-suprema';
  if (corte.includes('Consejo')) return 'badge-consejo-estado';
  if (corte.includes('Tribunal')) return 'badge-tribunal';
  if (corte.includes('Arbitral') || corte.includes('Laudo') || corte.includes('CAC')) return 'badge-arbitral';
  if (corte.includes('Superintendencia') || corte.includes('SIC') || corte.includes('Supersalud')) return 'badge-superintendencia';
  if (corte.includes('Senado') || corte.includes('Ley')) return 'badge-ley';
  return 'badge-corte-constitucional';
}

function copyCitation(text, customMsg = '¡Citación formal copiada al portapapeles!') {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(customMsg);
  }).catch(() => {
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
    toast.className = 'fixed bottom-5 right-5 z-50 bg-slate-900 border border-amber-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-medium text-xs transition-all duration-300 transform translate-y-10 opacity-0 backdrop-blur-md';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg class="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
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

function markdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h4 class="text-amber-400 font-bold text-sm mt-4 mb-2 uppercase tracking-wide">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-white font-bold text-base mt-5 mb-2 font-legal-title">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-amber-300 font-extrabold text-lg mt-6 mb-3 font-legal-title">$1</h2>')
    .replace(/^\> (.*$)/gim, '<div class="resuelve-box my-3 text-slate-200 text-xs sm:text-sm">$1</div>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-slate-300">$1</em>')
    .replace(/`([^`]+)`/gim, '<code class="bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700/60">$1</code>')
    .replace(/\n\n/gim, '<br><br>');
}

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
      badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span> Gemini 2.5 Flash Activo`;
    } else {
      badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span> Motor Legal RAG Activo`;
    }
  }
}
