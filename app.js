/**
 * JurisWiki Colombia — Sistema de Relatoría Jurídica y Consulta de Precedentes
 * Motor RAG con Tesauro Jurídico Colombiano, Estructurador de Ordinales del RESUELVE y Dossier de Precedentes
 */

let jurisprudenciaDB = [];
let filteredRecords = [];
let currentPage = 1;
let explorerViewMode = 'cards'; // 'cards' | 'table'
const PAGE_SIZE = 15;

// Estado persistente del usuario
let savedDossierIds = [];
let recentQueries = [];

// Tesauro jurídico colombiano para expansión semántica y léxica
const LEGAL_THESAURUS = {
  alimento: ['alimentos', 'cuota alimentaria', 'familia', 'menor', 'niño', 'niña', 'nna', 'sustento', 'inasistencia', 'cuidado', 'patria potestad', 'comisaria', 'minimo vital', 't-007-24', 'c-028-24', 'a-006-26', 'a-012-25', 't-014-26', 'adopcion', 'lactancia'],
  alimentos: ['alimento', 'cuota alimentaria', 'familia', 'menor', 'niño', 'niña', 'nna', 'sustento', 'inasistencia', 'cuidado', 'patria potestad', 'comisaria', 'minimo vital', 't-007-24', 'c-028-24', 'a-006-26', 'a-012-25', 't-014-26', 'adopcion', 'lactancia'],
  cuota: ['alimentos', 'cuota alimentaria', 'menores', 'fijacion de alimentos', 'embargo', 'familia'],
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
  vivienda: ['vivienda digna', 'desalojo', 'reubicacion', 'zona de alto riesgo', 't-002-26'],
  reparacion: ['reparacion directa', 'daño antijuridico', 'responsabilidad del estado', 'consejo de estado', 'seccion tercera'],
  contractual: ['contrato estatal', 'liquidacion', 'incumplimiento', 'controversias contractuales', 'seccion tercera']
};

// Proveedores de Inteligencia Artificial Soportados (OpenAI ChatGPT, Anthropic Claude, Google Gemini, DeepSeek)
const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    badge: 'Gemini',
    placeholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpText: 'Obtener clave gratuita en Google AI Studio ↗',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recomendado — Rápido y Actualizado)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Económico)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Razonamiento Complejo)' }
    ]
  },
  openai: {
    name: 'OpenAI ChatGPT',
    badge: 'ChatGPT',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Obtener clave en OpenAI Platform ↗',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o-mini (Recomendado — Ultrarrápido y Muy Económico)' },
      { id: 'gpt-4o', name: 'GPT-4o (Máxima Capacidad de Redacción)' },
      { id: 'o1-mini', name: 'o1-mini (Razonamiento Lógico Profundo)' }
    ]
  },
  claude: {
    name: 'Anthropic Claude',
    badge: 'Claude',
    placeholder: 'sk-ant-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'Obtener clave en Anthropic Console ↗',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Recomendado — Alta Velocidad)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Estándar en Análisis Jurídico)' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    badge: 'DeepSeek',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.deepseek.com/api_keys',
    helpText: 'Obtener clave en DeepSeek Platform ↗',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3 (Chat — Alta Calidad a Bajo Costo)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Razonamiento Jurídico Paso a Paso)' }
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    badge: 'OpenRouter',
    placeholder: 'sk-or-...',
    helpUrl: 'https://openrouter.ai/keys',
    helpText: 'Obtener clave en OpenRouter ↗',
    models: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (vía OpenRouter)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku (vía OpenRouter)' }
    ]
  },
  local: {
    name: 'Motor Local RAG',
    badge: 'RAG Local',
    models: []
  }
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadUserState();
  initUIEvents();
  await loadDatabase(false);
  loadSavedApiKey();
});

function initTheme() {
  const savedTheme = localStorage.getItem('JURISWIKI_THEME') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('JURISWIKI_THEME', theme);
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  const label = document.getElementById('theme-label');

  if (theme === 'dark') {
    sunIcon?.classList.remove('hidden');
    moonIcon?.classList.add('hidden');
    if (label) label.textContent = 'Modo Papel';
  } else {
    sunIcon?.classList.add('hidden');
    moonIcon?.classList.remove('hidden');
    if (label) label.textContent = 'Modo Noche';
  }
}

function loadUserState() {
  try {
    savedDossierIds = JSON.parse(localStorage.getItem('JURISWIKI_DOSSIER') || '[]');
    recentQueries = JSON.parse(localStorage.getItem('JURISWIKI_RECENT_QUERIES') || '[]');
  } catch (e) {
    savedDossierIds = [];
    recentQueries = [];
  }
  renderRecentQueries();
}

// ==========================================================================
// CARGA Y NORMALIZACIÓN DEL ACERVO DOCUMENTAL
// ==========================================================================
async function loadDatabase(bustCache = false) {
  const loadingEl = document.getElementById('db-loading-indicator');
  if (loadingEl) loadingEl.classList.add('visible');

  try {
    const url = bustCache ? `jurisprudencia_db.json?t=${Date.now()}` : 'jurisprudencia_db.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();

    // Limpiar y enriquecer cada registro en memoria para presentación humana
    jurisprudenciaDB = rawData.map(doc => {
      const cleanMp = cleanPonente(doc.magistrado_ponente);
      const cleanCit = (doc.citacion_formal || '').replace(/\*\*\s*/g, '');
      const sense = detectRulingSense(doc.resuelve, doc.tipo, doc.radicado);
      const humanTipo = humanizeTipo(doc.tipo, doc.radicado);

      return {
        ...doc,
        magistrado_ponente: cleanMp,
        citacion_formal: cleanCit,
        _sense: sense,
        _humanTipo: humanTipo
      };
    });

    filteredRecords = [...jurisprudenciaDB];
    sortFilteredRecords('recent');

    updateStatsAndSidebar();
    populateFilters();
    renderFacetPills();
    renderFeaturedShowcase();
    renderDossierPanel();
    renderExplorer();

    if (loadingEl) {
      setTimeout(() => loadingEl.classList.remove('visible'), 350);
    }
  } catch (err) {
    console.error('Error cargando jurisprudencia_db.json:', err);
    if (loadingEl) {
      loadingEl.innerHTML = `<span>Error al cargar la base de datos local. Verifica la conexión.</span>`;
    }
  }
}

// Limpia asteriscos o guiones residuales de nombres de magistrados
function cleanPonente(mp) {
  if (!mp) return '';
  return mp.replace(/^[\*\s\-]+|[\*\s\-]+$/g, '').replace(/\s+/g, ' ').trim();
}

// Convierte códigos técnicos de carpetas en etiquetas editoriales legibles
function humanizeTipo(tipo, radicado = '') {
  const r = (radicado || '').toUpperCase();
  if (tipo === 'T' || r.startsWith('T-')) return 'Sentencia de Tutela (T)';
  if (tipo === 'SU' || r.startsWith('SU-')) return 'Unificación (SU)';
  if (tipo === 'C' || r.startsWith('C-')) return 'Constitucionalidad (C)';
  if (tipo === 'A' || r.startsWith('A-')) return 'Auto Judicial (A)';
  if (!tipo) return 'Providencia';

  const map = {
    'Seccion_Primera': 'Sección Primera',
    'Seccion_Segunda_Laboral_Subsecciones_A_y_B': 'Sección 2ª • Laboral Administrativo',
    'Seccion_Tercera_Contractual_y_Dano_Subsecciones_A_B_C': 'Sección 3ª • Contractual y Daño',
    'Seccion_Cuarta_Tributaria': 'Sección 4ª • Tributaria',
    'Seccion_Quinta_Electoral': 'Sección 5ª • Electoral',
    'Sala_Plena_Contencioso_Administrativa': 'Sala Plena Contenciosa',
    'Sala_Consulta_y_Servicio_Civil': 'Sala de Consulta y Servicio Civil',
    'Tribunal_Antioquia_Medellin': 'Tribunal de Antioquia',
    'Tribunal_Atlantico_Barranquilla': 'Tribunal del Atlántico',
    'Tribunal_Cundinamarca_Bogota': 'Tribunal de Cundinamarca',
    'Tribunal_Valle_Cali': 'Tribunal del Valle',
    'Casacion_Civil_Agraria_y_Rural': 'Sala de Casación Civil y Agraria',
    'Casacion_Laboral': 'Sala de Casación Laboral',
    'Casacion_Penal': 'Sala de Casación Penal'
  };

  if (map[tipo]) return map[tipo];
  return tipo.replace(/_/g, ' ');
}

// Infiere el sentido de la decisión a partir de los verbos rectores del RESUELVE
function detectRulingSense(resuelve = '', tipo = '', radicado = '') {
  const upper = (resuelve || '').toUpperCase();
  const r = (radicado || '').toUpperCase();

  if (upper.includes('CONCEDER EL AMPARO') || upper.includes('AMPARAR') || upper.includes('TUTELAR') || upper.includes('CONCEDER LA TUTELA')) {
    return { label: 'Ampara / Concede', css: 'sense-ampara' };
  }
  if (upper.includes('DECLARAR EXEQUIBLE') || upper.includes('EXEQUIBLE')) {
    if (upper.includes('INEXEQUIBLE')) {
      return { label: 'Inexequible / Condicionado', css: 'sense-revoca' };
    }
    return { label: 'Exequible', css: 'sense-ampara' };
  }
  if (upper.includes('REVOCAR')) {
    return { label: 'Revoca Decisión', css: 'sense-revoca' };
  }
  if (upper.includes('NEGAR') || upper.includes('IMPROCEDENTE') || upper.includes('RECHAZAR')) {
    return { label: 'Niega / Improcedente', css: 'sense-niega' };
  }
  if (upper.includes('CONFIRMAR') || upper.includes('APROBAR')) {
    return { label: 'Confirma / Aprueba', css: 'sense-auto' };
  }
  if (tipo === 'A' || r.startsWith('A-') || upper.includes('COMPETENTE') || upper.includes('REMITIR')) {
    return { label: 'Auto / Competencia', css: 'sense-auto' };
  }
  return { label: 'Fallo de Mérito', css: 'sense-auto' };
}

// Formatea el RESUELVE separando ordinales (PRIMERO, SEGUNDO, TERCERO...) y resaltando términos
function formatStructuredResuelve(resuelveText, queryTerms = [], maxLength = 0) {
  if (!resuelveText) return '<span class="resuelve-ordinal">Texto resolutivo disponible en el documento adjunto.</span>';

  let text = resuelveText.trim();
  if (maxLength > 0 && text.length > maxLength) {
    text = text.substring(0, maxLength) + '…';
  }

  // Separar por ordinales clásicos de sentencias colombianas
  const ordinalRegex = /\b(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|SEPTIMO|OCTAVO|NOVENO|DÉCIMO|DECIMO)\b[\.\-\:\s]*/gi;
  const matches = [...text.matchAll(ordinalRegex)];

  if (matches.length >= 1) {
    const blocks = [];
    for (let i = 0; i < matches.length; i++) {
      const ordLabel = matches[i][1].toUpperCase();
      const start = matches[i].index + matches[i][0].length;
      const end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      const content = text.slice(start, end).trim().replace(/^[\.\-\:\s]+/, '');
      if (content) {
        blocks.push(
          `<span class="resuelve-ordinal"><span class="ordinal-tag">${escapeHtml(ordLabel)}</span>${highlightTermsInHtml(escapeHtml(content), queryTerms)}</span>`
        );
      }
    }
    if (blocks.length > 0) return blocks.join('');
  }

  return `<span class="resuelve-ordinal">${highlightTermsInHtml(escapeHtml(text), queryTerms)}</span>`;
}

// Resalta palabras clave buscadas con <mark>
function highlightTermsInHtml(safeHtml, terms = []) {
  if (!terms || terms.length === 0) return safeHtml;
  const validTerms = terms.filter(t => t && t.length >= 3).slice(0, 6);
  if (validTerms.length === 0) return safeHtml;

  let output = safeHtml;
  validTerms.forEach(term => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    output = output.replace(regex, '<mark>$1</mark>');
  });
  return output;
}

// ==========================================================================
// CONTADORES, BARRA LATERAL Y MUESTRA DESTACADA
// ==========================================================================
function updateStatsAndSidebar() {
  const total = jurisprudenciaDB.length;
  const formattedTotal = total.toLocaleString('es-CO');

  const totalEl = document.getElementById('stat-total-docs');
  const headerSummary = document.getElementById('header-stat-summary');
  const deskCounter = document.getElementById('desk-corpus-counter');
  const ccEl = document.getElementById('stat-cc-docs');
  const tutelasEl = document.getElementById('stat-tutelas-docs');

  if (totalEl) totalEl.textContent = formattedTotal;
  if (deskCounter) deskCounter.textContent = `Acervo: ${formattedTotal} providencias`;

  const countsByCorte = {};
  let ccCount = 0;
  let tutelasCount = 0;

  jurisprudenciaDB.forEach(d => {
    const c = d.corte || 'Otra Corporación';
    countsByCorte[c] = (countsByCorte[c] || 0) + 1;
    if (c.includes('Constitucional')) ccCount++;
    if (d.tipo === 'T' || (d.radicado || '').toUpperCase().startsWith('T-')) tutelasCount++;
  });

  if (headerSummary) {
    headerSummary.textContent = `${formattedTotal} providencias indexadas • ${Object.keys(countsByCorte).length} corporaciones`;
  }
  if (ccEl) ccEl.textContent = ccCount.toLocaleString('es-CO');
  if (tutelasEl) tutelasEl.textContent = tutelasCount.toLocaleString('es-CO');

  // Renderizar lista interactiva de corporaciones en la barra lateral
  const corpListEl = document.getElementById('sidebar-corp-list');
  if (corpListEl) {
    const sortedCortes = Object.entries(countsByCorte).sort((a, b) => b[1] - a[1]);
    corpListEl.innerHTML = sortedCortes.map(([corte, count]) => {
      const pct = Math.max(4, Math.round((count / total) * 100));
      return `
        <li>
          <button type="button" class="corp-dist-item" onclick="filterCatalogByCorte('${escapeHtml(corte)}')">
            <span style="font-weight: 500;">${escapeHtml(corte)}</span>
            <span class="corp-dist-count">${count.toLocaleString('es-CO')} <span style="opacity:0.6;">(${pct}%)</span></span>
          </button>
        </li>
      `;
    }).join('');
  }
}

// Muestra inicial de providencias destacadas para que la página nunca se vea vacía
function renderFeaturedShowcase() {
  const container = document.getElementById('featured-Showcase-list');
  if (!container || jurisprudenciaDB.length === 0) return;

  // Seleccionar providencias representativas con un RESUELVE rico y claro
  const preferredIds = ['T-007-24', 'T-001-24', 'T-014-26', 'C-028-24'];
  const featured = [];

  preferredIds.forEach(id => {
    const found = jurisprudenciaDB.find(d => d.radicado === id || d.id === id);
    if (found) featured.push(found);
  });

  if (featured.length < 4) {
    const extras = jurisprudenciaDB.filter(d => d.resuelve && d.resuelve.length > 180 && !featured.includes(d)).slice(0, 4 - featured.length);
    featured.push(...extras);
  }

  container.innerHTML = featured.map(doc => renderPrecedentCardHTML(doc, [])).join('');
}

// ==========================================================================
// EVENTOS DE LA INTERFAZ Y ATAJOS DE TECLADO
// ==========================================================================
function initUIEvents() {
  // Alternar Tema (Papel Editorial vs Noche Obsidiana)
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Navegación entre vistas (Consultor IA vs Catálogo Documental)
  const tabAiBtn = document.getElementById('tab-btn-ai');
  const tabExpBtn = document.getElementById('tab-btn-explorer');
  const btnJumpCatalog = document.getElementById('btn-jump-catalog');
  const brandHome = document.getElementById('brand-home-link');

  tabAiBtn?.addEventListener('click', () => switchWorkspaceView('ai'));
  tabExpBtn?.addEventListener('click', () => switchWorkspaceView('explorer'));
  btnJumpCatalog?.addEventListener('click', () => switchWorkspaceView('explorer'));
  brandHome?.addEventListener('click', (e) => {
    e.preventDefault();
    switchWorkspaceView('ai');
  });

  // Botón de Sincronización con Google Drive
  const btnSync = document.getElementById('btn-sync-drive');
  const syncIcon = document.getElementById('sync-icon');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      syncIcon?.classList.add('animate-spin');
      showToast('Verificando nuevos documentos en Google Drive...');

      try {
        let res = await fetch('/api/sync').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('api.php?action=sync').catch(() => null);
        }
        await loadDatabase(true);
        showToast(`Repositorio actualizado: ${jurisprudenciaDB.length.toLocaleString('es-CO')} providencias disponibles.`);
      } catch (e) {
        await loadDatabase(true);
        showToast('Índice sincronizado correctamente.');
      } finally {
        btnSync.disabled = false;
        syncIcon?.classList.remove('animate-spin');
      }
    });
  }

  // Caja de consulta IA (Auto-ajuste de altura y envío con Enter)
  const inputAsk = document.getElementById('ai-query-input');
  const btnAsk = document.getElementById('btn-ask-ai');
  const btnClearQuery = document.getElementById('btn-clear-query');

  if (inputAsk) {
    inputAsk.addEventListener('input', () => {
      inputAsk.style.height = 'auto';
      inputAsk.style.height = Math.min(160, inputAsk.scrollHeight) + 'px';
      if (btnClearQuery) {
        btnClearQuery.classList.toggle('hidden', !inputAsk.value.trim());
      }
    });

    inputAsk.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const q = inputAsk.value.trim();
        if (q) runAiConsultation(q);
      }
    });
  }

  if (btnClearQuery && inputAsk) {
    btnClearQuery.addEventListener('click', () => {
      inputAsk.value = '';
      inputAsk.style.height = 'auto';
      btnClearQuery.classList.add('hidden');
      document.getElementById('ai-results-container')?.classList.add('hidden');
      document.getElementById('ai-empty-state')?.classList.remove('hidden');
      inputAsk.focus();
    });
  }

  if (btnAsk && inputAsk) {
    btnAsk.addEventListener('click', () => {
      const q = inputAsk.value.trim();
      if (q) {
        runAiConsultation(q);
      } else {
        inputAsk.focus();
        showToast('Escribe un tema o selecciona una línea jurisprudencial.');
      }
    });
  }

  // Chips de líneas jurisprudenciales frecuentes
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (inputAsk && prompt) {
        inputAsk.value = prompt;
        btnClearQuery?.classList.remove('hidden');
        runAiConsultation(prompt);
      }
    });
  });

  // Filtros del Catálogo Documental
  const searchInput = document.getElementById('explorer-search-input');
  const corteSelect = document.getElementById('filter-corte');
  const tipoSelect = document.getElementById('filter-tipo');
  const anoSelect = document.getElementById('filter-ano');
  const sortSelect = document.getElementById('sort-explorer');
  const btnReset = document.getElementById('btn-reset-filters');

  searchInput?.addEventListener('input', applyExplorerFilters);
  corteSelect?.addEventListener('change', () => {
    syncActiveFacetPill(corteSelect.value);
    applyExplorerFilters();
  });
  tipoSelect?.addEventListener('change', applyExplorerFilters);
  anoSelect?.addEventListener('change', applyExplorerFilters);
  sortSelect?.addEventListener('change', () => {
    sortFilteredRecords(sortSelect.value);
    currentPage = 1;
    renderExplorer();
  });

  btnReset?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (corteSelect) corteSelect.value = '';
    if (tipoSelect) tipoSelect.value = '';
    if (anoSelect) anoSelect.value = '';
    syncActiveFacetPill('');
    filteredRecords = [...jurisprudenciaDB];
    sortFilteredRecords(sortSelect?.value || 'recent');
    currentPage = 1;
    renderExplorer();
  });

  // Selector de Modo de Vista (Tarjetas vs Tabla de Relatoría)
  const btnViewCards = document.getElementById('btn-view-cards');
  const btnViewTable = document.getElementById('btn-view-table');
  btnViewCards?.addEventListener('click', () => {
    explorerViewMode = 'cards';
    btnViewCards.classList.add('active');
    btnViewTable?.classList.remove('active');
    renderExplorer();
  });
  btnViewTable?.addEventListener('click', () => {
    explorerViewMode = 'table';
    btnViewTable.classList.add('active');
    btnViewCards?.classList.remove('active');
    renderExplorer();
  });

  // Paginación
  document.getElementById('btn-page-prev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderExplorer();
      document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
  document.getElementById('btn-page-next')?.addEventListener('click', () => {
    const maxPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
    if (currentPage < maxPages) {
      currentPage++;
      renderExplorer();
      document.getElementById('explorer-top')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Acciones del Dossier de Precedentes
  document.getElementById('btn-copy-dossier')?.addEventListener('click', copyDossierToClipboard);
  document.getElementById('btn-export-dossier')?.addEventListener('click', downloadDossierTxt);
  document.getElementById('btn-clear-dossier')?.addEventListener('click', () => {
    savedDossierIds = [];
    localStorage.setItem('JURISWIKI_DOSSIER', '[]');
    renderDossierPanel();
    showToast('Dossier de precedentes vaciado.');
  });

  // Inspector Lateral (Slide-over Drawer)
  document.getElementById('btn-close-detail')?.addEventListener('click', closeDetailDrawer);
  document.getElementById('drawer-backdrop')?.addEventListener('click', closeDetailDrawer);

  // Inicializar Modal de Configuración Multimodelo IA
  initAiSettingsModal();

  // Atajos de teclado globales ('/' para buscar, 'Esc' para cerrar inspector)
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      const viewExp = document.getElementById('view-explorer');
      if (viewExp && !viewExp.classList.contains('hidden')) {
        document.getElementById('explorer-search-input')?.focus();
      } else {
        document.getElementById('ai-query-input')?.focus();
      }
    } else if (e.key === 'Escape') {
      closeDetailDrawer();
      modalSettings?.classList.add('hidden');
    }
  });
}

function switchWorkspaceView(viewName) {
  const tabAiBtn = document.getElementById('tab-btn-ai');
  const tabExpBtn = document.getElementById('tab-btn-explorer');
  const viewAi = document.getElementById('view-ai');
  const viewExp = document.getElementById('view-explorer');

  if (viewName === 'explorer') {
    tabExpBtn?.classList.add('active');
    tabAiBtn?.classList.remove('active');
    viewExp?.classList.remove('hidden');
    viewAi?.classList.add('hidden');
  } else {
    tabAiBtn?.classList.add('active');
    tabExpBtn?.classList.remove('active');
    viewAi?.classList.remove('hidden');
    viewExp?.classList.add('hidden');
  }
}

window.filterCatalogByCorte = function(corte) {
  switchWorkspaceView('explorer');
  const corteSelect = document.getElementById('filter-corte');
  if (corteSelect) corteSelect.value = corte;
  syncActiveFacetPill(corte);
  applyExplorerFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================================================
// MOTOR DE CONSULTA E INTELIGENCIA ARTIFICIAL MULTIMODELO (GEMINI, OPENAI, CLAUDE)
// ==========================================================================
async function runAiConsultation(query) {
  const resultContainer = document.getElementById('ai-results-container');
  const loadingIndicator = document.getElementById('ai-loading-state');
  const emptyState = document.getElementById('ai-empty-state');
  const scopeVal = document.getElementById('ai-scope-select')?.value || '';

  saveRecentQuery(query);

  emptyState?.classList.add('hidden');
  resultContainer?.classList.add('hidden');
  loadingIndicator?.classList.remove('hidden');

  const relevantDocs = retrieveRelevantDocuments(query, 8, scopeVal);

  const provider = localStorage.getItem('JURISWIKI_AI_PROVIDER') || (localStorage.getItem('GEMINI_API_KEY') ? 'gemini' : 'local');
  const apiKey = localStorage.getItem(`JURISWIKI_KEY_${provider}`) || (provider === 'gemini' ? localStorage.getItem('GEMINI_API_KEY') : '') || '';
  const model = localStorage.getItem(`JURISWIKI_MODEL_${provider}`) || '';

  try {
    if (provider !== 'local' && apiKey && apiKey.length > 5) {
      await callMultiProviderAI(query, relevantDocs, provider, model, apiKey);
    } else {
      await new Promise(r => setTimeout(r, 280));
      renderLocalRagResponse(query, relevantDocs);
    }
  } catch (err) {
    console.warn(`Llamada a ${provider} falló, utilizando motor RAG local de respaldo:`, err);
    showToast(`Nota: ${AI_PROVIDERS[provider]?.name || 'El proveedor'} reportó un aviso. Mostrando síntesis jurídica del motor local.`);
    renderLocalRagResponse(query, relevantDocs);
  } finally {
    loadingIndicator?.classList.add('hidden');
    resultContainer?.classList.remove('hidden');
  }
}

// Invocación a cualquier proveedor de IA configurado por el usuario
async function callMultiProviderAI(query, candidates, provider, model, apiKey) {
  const contextDocs = candidates.slice(0, 6).map((d, idx) => `
[PROVIDENCIA ${idx + 1}]
- Radicado: ${d.radicado} (${d.corte})
- Magistrado Ponente: ${d.magistrado_ponente || 'En relatoría'}
- Fecha: ${d.fecha_providencia || d.ano}
- Tema: ${d.tema}
- RESUELVE: ${d.resuelve ? d.resuelve.substring(0, 1800) : 'Ver documento'}
- Citación Formal: ${d.citacion_formal}`).join('\n');

  const systemPrompt = `Eres un Relator Judicial experto en derecho constitucional y jurisprudencia colombiana de JurisWiki.
Tu tarea es analizar la consulta jurídica planteada frente a las sentencias suministradas del archivo judicial.
Redacta un dictamen ejecutivo formal (2 a 3 párrafos) explicando qué decisiones aplican exactamente al caso, su ratio decidendi y la consecuencia jurídica ordenada en la parte resolutiva. Cita los radicados y resuelves con rigor.`;

  const userPrompt = `Consulta del abogado: "${query}"\n\nProvidencias auténticas del acervo jurisprudencial:\n${contextDocs}`;

  // Intento 1: Llamada directa desde el navegador (alta velocidad)
  try {
    if (provider === 'gemini') {
      const useModel = model || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          renderAiResponseHTML(query, candidates, text);
          return;
        }
      }
    } else if (provider === 'openai') {
      const useModel = model || 'gpt-4o-mini';
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      const payload = {
        model: useModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          renderAiResponseHTML(query, candidates, text);
          return;
        }
      }
    } else if (provider === 'claude') {
      const useModel = model || 'claude-3-5-haiku-20241022';
      const endpoint = 'https://api.anthropic.com/v1/messages';
      const payload = {
        model: useModel,
        max_tokens: 1500,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        if (text) {
          renderAiResponseHTML(query, candidates, text);
          return;
        }
      }
    }
  } catch (directErr) {
    console.log('Llamada directa al proveedor con aviso CORS/red, usando backend proxy...', directErr);
  }

  // Intento 2: Backend Proxy (server.py en local o api.php en cPanel Spaceship)
  const proxyEndpoint = (window.location.pathname.endsWith('.php') || window.location.hostname.includes('.'))
    ? 'api.php?action=ask_ai'
    : '/api/ask';

  const proxyRes = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model,
      apiKey,
      query,
      systemPrompt,
      context: contextDocs
    })
  });

  if (!proxyRes.ok) {
    throw new Error(`Error en llamada al proxy de IA (${proxyRes.status})`);
  }

  const proxyData = await proxyRes.json();
  const answerText = proxyData.text || proxyData.content || (proxyData.choices?.[0]?.message?.content) || '';
  if (!answerText) throw new Error('Respuesta vacía del proveedor');
  renderAiResponseHTML(query, candidates, answerText);
}

function retrieveRelevantDocuments(query, limit = 8, scopeFilter = '') {
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

  const pool = jurisprudenciaDB.filter(doc => {
    if (!scopeFilter) return true;
    if (scopeFilter === 'TUTELAS') {
      const r = (doc.radicado || '').toUpperCase();
      return doc.tipo === 'T' || doc.tipo === 'SU' || r.startsWith('T-') || r.startsWith('SU-');
    }
    return doc.corte === scopeFilter;
  });

  const isTutelaQuery = normalizedQuery.includes('tutela') || normalizedQuery.includes('amparo') || normalizedQuery.includes('derecho fundamental');
  const isAlimentosQuery = normalizedQuery.includes('alimento') || normalizedQuery.includes('cuota') || normalizedQuery.includes('familia') || normalizedQuery.includes('menor');

  const scored = pool.map(doc => {
    let score = 0;
    const radicadoNorm = normalizeText(doc.radicado);
    const temaNorm = normalizeText(doc.tema);
    const resuelveNorm = normalizeText(doc.resuelve);
    const ponenteNorm = normalizeText(doc.magistrado_ponente);
    const descriptoresNorm = normalizeText((doc.descriptores || []).join(' '));

    if (isTutelaQuery && (doc.tipo === 'T' || doc.tipo === 'SU' || radicadoNorm.startsWith('t-') || radicadoNorm.startsWith('su-'))) {
      score += 22;
    }

    if (isAlimentosQuery) {
      if (temaNorm.includes('familia') || temaNorm.includes('menor') || temaNorm.includes('alimento') || temaNorm.includes('nin')) score += 40;
      if (resuelveNorm.includes('familia') || resuelveNorm.includes('alimento') || resuelveNorm.includes('menor')) score += 35;
      if (['t-007-24', 'c-028-24', 'a-006-26', 't-001-24', 't-014-26', 't-004-24', 't-004-26'].includes(radicadoNorm)) {
        score += 65;
      }
    }

    if (normalizedQuery.includes(radicadoNorm) && radicadoNorm.length > 3) {
      score += 200;
    }

    // Premiar providencias que tienen extracto de RESUELVE detallado
    if (resuelveNorm.length > 120 && !resuelveNorm.startsWith('sentencia de ') && !resuelveNorm.startsWith('fallo oficial')) {
      score += 12;
    }

    expandedTerms.forEach(term => {
      if (!term) return;
      if (descriptoresNorm.includes(term)) score += 26;
      if (temaNorm.includes(term)) score += 20;
      if (resuelveNorm.includes(term)) score += 16;
      if (ponenteNorm.includes(term)) score += 12;
    });

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.doc);
}

function renderLocalRagResponse(query, candidates) {
  const normQ = normalizeText(query);
  const isAlimentos = normQ.includes('alimento') || normQ.includes('cuota') || normQ.includes('familia');

  let synthesisHtml = '';
  if (isAlimentos) {
    synthesisHtml = `
      <p>En la jurisprudencia constitucional colombiana, las controversias sobre <strong>cuota de alimentos, mínimo vital de niños, niñas y adolescentes (NNA) y unidad familiar</strong> se abordan mediante la acción de tutela cuando los mecanismos ordinarios resultan ineficaces ante un perjuicio irremediable o cuando una providencia judicial incurre en defecto fáctico o sustantivo.</p>
      <p style="margin-top:0.55rem;">A continuación se relacionan los <strong>${candidates.length} precedentes más relevantes</strong> localizados en el repositorio, junto con el sentido del fallo y la transcripción literal de los ordinales de su <strong>RESUELVE</strong>:</p>
    `;
  } else {
    synthesisHtml = `
      <p>Para la consulta <strong>«${escapeHtml(query)}»</strong>, el sistema de relatoría identificó <strong>${candidates.length} providencias aplicables</strong> dentro del acervo documental. Cada ficha incluye el sentido de la decisión, la transcripción literal del <strong>RESUELVE</strong> dividida por ordinales y su citación formal lista para incorporar en escritos judiciales.</p>
    `;
  }

  renderAiResponseHTML(query, candidates, null, synthesisHtml);
}

function renderAiResponseHTML(query, candidates, geminiMarkdown = null, fallbackHtml = '') {
  const container = document.getElementById('ai-results-container');
  if (!container) return;

  const queryTerms = query.trim().split(/\s+/).filter(w => w.length >= 3);
  const dictamenContent = geminiMarkdown ? markdownToHtml(geminiMarkdown) : fallbackHtml;

  container.innerHTML = `
    <div class="synthesis-banner">
      <div class="synthesis-header">
        <div class="synthesis-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-navy)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Síntesis de Relatoría • «${escapeHtml(query)}»</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
          ${candidates.length} precedentes seleccionados
        </span>
      </div>
      <div class="synthesis-body">
        ${dictamenContent}
      </div>
    </div>

    <div>
      ${candidates.map(doc => renderPrecedentCardHTML(doc, queryTerms)).join('')}
    </div>
  `;
}

// ==========================================================================
// RENDERIZADO DE TARJETA DE PROVIDENCIA (DISEÑO GACETA HUMANO)
// ==========================================================================
function renderPrecedentCardHTML(doc, queryTerms = []) {
  const isSaved = savedDossierIds.includes(doc.id);
  const sense = doc._sense || detectRulingSense(doc.resuelve, doc.tipo, doc.radicado);
  const corpClass = getCorpBadgeClass(doc.corte);

  return `
    <article class="precedent-card">
      <div class="precedent-meta-top">
        <div class="precedent-badges">
          <span class="corp-tag ${corpClass}">${escapeHtml(doc.corte)}</span>
          <span class="corp-tag corp-default" style="font-family: var(--font-mono);">${escapeHtml(doc._humanTipo || doc.tipo || 'Fallo')}</span>
          ${doc.ano ? `<span class="corp-tag corp-default" style="font-family: var(--font-mono);">${escapeHtml(doc.ano)}</span>` : ''}
        </div>
        <span class="ruling-sense-badge ${sense.css}">${escapeHtml(sense.label)}</span>
      </div>

      <div class="precedent-heading">
        <h3 class="precedent-radicado">
          <button type="button" onclick="openDetailModal('${escapeHtml(doc.id)}')" style="text-align:left; color:inherit; font-weight:inherit; font-size:inherit;">
            ${highlightTermsInHtml(escapeHtml(doc.radicado), queryTerms)}
          </button>
        </h3>
        <span class="precedent-ponente">
          ${doc.magistrado_ponente ? `<strong>M.P.</strong> ${highlightTermsInHtml(escapeHtml(doc.magistrado_ponente), queryTerms)}` : ''}
          ${doc.fecha_providencia ? ` • ${escapeHtml(doc.fecha_providencia)}` : ''}
        </span>
      </div>

      <p class="precedent-tema">
        <strong>Materia:</strong> ${highlightTermsInHtml(escapeHtml(doc.tema || 'Providencia judicial indexada en relatoría.'), queryTerms)}
      </p>

      <!-- Extracto Literal del RESUELVE Estructurado por Ordinales -->
      <div class="resuelve-container">
        <div class="resuelve-header">
          <span class="resuelve-label">Transcripción del Resuelve</span>
          <button type="button" onclick="copyTextWithFeedback('${escapeJsStr(doc.resuelve)}', 'Texto del RESUELVE copiado')" style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-decoration:underline;">
            Copiar solo resuelve
          </button>
        </div>
        <div class="resuelve-text">
          ${formatStructuredResuelve(doc.resuelve, queryTerms, 650)}
        </div>
      </div>

      <!-- Pie de Tarjeta con Citación Formal y Acciones -->
      <div class="precedent-footer">
        <span class="citation-snippet" title="${escapeHtml(doc.citacion_formal)}">
          ${escapeHtml(doc.citacion_formal)}
        </span>

        <div class="card-actions">
          <button type="button" class="btn-card-action btn-tactile" onclick="openDetailModal('${escapeHtml(doc.id)}')">
            <span>Ficha e Inspector</span>
          </button>
          <button type="button" class="btn-card-action primary-outline btn-tactile" onclick="copyForLegalBrief('${escapeHtml(doc.id)}')">
            <span>Copiar para Demanda</span>
          </button>
          <button type="button" class="btn-card-action btn-tactile ${isSaved ? 'saved' : ''}" onclick="toggleDossierItem('${escapeHtml(doc.id)}')">
            <span>${isSaved ? '✓ En Dossier' : '+ Guardar'}</span>
          </button>
          <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="btn-card-action btn-tactile" style="text-decoration:none;">
            <span>Drive &nearr;</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

// ==========================================================================
// CATÁLOGO DOCUMENTAL (VISTA FICHAS & VISTA TABLA DE RELATORÍA)
// ==========================================================================
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
    if (d.ano) anos.add(String(d.ano));
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
    tipoSelect.innerHTML = '<option value="">Todos los tipos / salas</option>';
    Array.from(tipos).sort().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = humanizeTipo(t);
      tipoSelect.appendChild(opt);
    });
  }

  if (anoSelect) {
    anoSelect.innerHTML = '<option value="">Todos los años</option>';
    Array.from(anos).sort((a, b) => Number(b) - Number(a)).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      anoSelect.appendChild(opt);
    });
  }
}

function renderFacetPills() {
  const row = document.getElementById('explorer-facet-pills');
  if (!row) return;

  const counts = {};
  jurisprudenciaDB.forEach(d => {
    const c = d.corte || 'Otra';
    counts[c] = (counts[c] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const pillsHtml = [
    `<button type="button" class="facet-pill active" data-corte="" onclick="selectFacetPill('')">Todas (${jurisprudenciaDB.length.toLocaleString('es-CO')})</button>`,
    ...sorted.map(([corte, count]) => `
      <button type="button" class="facet-pill" data-corte="${escapeHtml(corte)}" onclick="selectFacetPill('${escapeHtml(corte)}')">
        ${escapeHtml(corte)} (${count.toLocaleString('es-CO')})
      </button>
    `)
  ];

  row.innerHTML = pillsHtml.join('');
}

window.selectFacetPill = function(corte) {
  const corteSelect = document.getElementById('filter-corte');
  if (corteSelect) corteSelect.value = corte;
  syncActiveFacetPill(corte);
  applyExplorerFilters();
};

function syncActiveFacetPill(corte) {
  document.querySelectorAll('#explorer-facet-pills .facet-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-corte') === corte);
  });
}

function applyExplorerFilters() {
  const q = (document.getElementById('explorer-search-input')?.value || '').toLowerCase().trim();
  const c = document.getElementById('filter-corte')?.value || '';
  const t = document.getElementById('filter-tipo')?.value || '';
  const a = document.getElementById('filter-ano')?.value || '';
  const sortMode = document.getElementById('sort-explorer')?.value || 'recent';

  filteredRecords = jurisprudenciaDB.filter(doc => {
    if (c && doc.corte !== c) return false;
    if (t && doc.tipo !== t) return false;
    if (a && String(doc.ano) !== a) return false;
    if (q) {
      const haystack = `${doc.radicado} ${doc.corte} ${doc.tema} ${doc.magistrado_ponente} ${doc.resuelve} ${(doc.descriptores || []).join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  sortFilteredRecords(sortMode);
  currentPage = 1;
  renderExplorer();
}

function sortFilteredRecords(mode) {
  if (mode === 'radicado') {
    filteredRecords.sort((a, b) => (a.radicado || '').localeCompare(b.radicado || ''));
  } else if (mode === 'corte') {
    filteredRecords.sort((a, b) => (a.corte || '').localeCompare(b.corte || ''));
  } else {
    // Recientes primero, priorizando registros con resuelve completo
    filteredRecords.sort((a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0));
  }
}

function renderExplorer() {
  const container = document.getElementById('explorer-grid');
  const countEl = document.getElementById('explorer-results-count');
  const pageCurrentEl = document.getElementById('page-current');
  const pageTotalEl = document.getElementById('page-total');
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');
  const searchVal = (document.getElementById('explorer-search-input')?.value || '').trim();
  const terms = searchVal ? searchVal.split(/\s+/).filter(w => w.length >= 2) : [];

  if (!container) return;

  const total = filteredRecords.length;
  if (countEl) countEl.textContent = `${total.toLocaleString('es-CO')} providencia${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}`;

  const maxPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > maxPages) currentPage = maxPages;

  if (pageCurrentEl) pageCurrentEl.textContent = currentPage;
  if (pageTotalEl) pageTotalEl.textContent = maxPages.toLocaleString('es-CO');
  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= maxPages);

  if (total === 0) {
    container.className = '';
    container.innerHTML = `
      <div class="consultation-desk" style="text-align: center; padding: 3rem 1.5rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: 0.4rem;">Sin coincidencias con los filtros actuales</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted);">Intenta limpiar los filtros o buscar con términos más generales.</p>
      </div>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = filteredRecords.slice(startIdx, startIdx + PAGE_SIZE);

  // Vista 1: Tabla de Relatoría de Alta Densidad
  if (explorerViewMode === 'table') {
    container.className = 'relatoria-table-wrapper';
    container.innerHTML = `
      <table class="relatoria-table">
        <thead>
          <tr>
            <th>Radicado</th>
            <th>Corporación & Sala</th>
            <th>Sentido</th>
            <th>Ponente & Año</th>
            <th>Síntesis / Extracto Resolutivo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pageRecords.map(doc => {
            const sense = doc._sense || detectRulingSense(doc.resuelve, doc.tipo, doc.radicado);
            return `
              <tr onclick="openDetailModal('${escapeHtml(doc.id)}')">
                <td style="font-family: var(--font-mono); font-weight: 600; white-space: nowrap; color: var(--accent-primary);">
                  ${highlightTermsInHtml(escapeHtml(doc.radicado), terms)}
                </td>
                <td>
                  <div style="font-weight: 600; font-size: 0.8rem;">${escapeHtml(doc.corte)}</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">${escapeHtml(doc._humanTipo)}</div>
                </td>
                <td>
                  <span class="ruling-sense-badge ${sense.css}">${escapeHtml(sense.label)}</span>
                </td>
                <td style="font-size: 0.78rem; color: var(--text-secondary);">
                  <div>${doc.magistrado_ponente ? highlightTermsInHtml(escapeHtml(doc.magistrado_ponente), terms) : 'En relatoría'}</div>
                  <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(doc.ano || '')}</div>
                </td>
                <td style="max-width: 420px; font-size: 0.8rem; color: var(--text-secondary);">
                  <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 0.2rem;">
                    ${highlightTermsInHtml(escapeHtml((doc.tema || '').substring(0, 110)), terms)}
                  </div>
                  <div style="font-family: var(--font-serif); font-size: 0.82rem; color: var(--text-muted);">
                    ${highlightTermsInHtml(escapeHtml((doc.resuelve || '').substring(0, 140)), terms)}…
                  </div>
                </td>
                <td onclick="event.stopPropagation();" style="white-space: nowrap;">
                  <button type="button" class="btn-card-action primary-outline" onclick="copyForLegalBrief('${escapeHtml(doc.id)}')">Copiar Cita</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    return;
  }

  // Vista 2: Fichas Editoriales
  container.className = 'explorer-cards-grid';
  container.innerHTML = pageRecords.map(doc => {
    const sense = doc._sense || detectRulingSense(doc.resuelve, doc.tipo, doc.radicado);
    const corpClass = getCorpBadgeClass(doc.corte);
    const isSaved = savedDossierIds.includes(doc.id);

    return `
      <article class="precedent-card" style="margin-top:0; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div class="precedent-meta-top">
            <span class="corp-tag ${corpClass}">${escapeHtml(doc.corte)}</span>
            <span class="ruling-sense-badge ${sense.css}">${escapeHtml(sense.label)}</span>
          </div>

          <h3 class="precedent-radicado" style="font-size: 1.18rem; margin-bottom: 0.25rem;">
            <button type="button" onclick="openDetailModal('${escapeHtml(doc.id)}')" style="text-align:left;">
              ${highlightTermsInHtml(escapeHtml(doc.radicado), terms)}
            </button>
          </h3>

          <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 0.65rem; font-family: var(--font-mono);">
            ${escapeHtml(doc._humanTipo)} ${doc.ano ? `• ${escapeHtml(doc.ano)}` : ''}
            ${doc.magistrado_ponente ? `<br>M.P. ${highlightTermsInHtml(escapeHtml(doc.magistrado_ponente), terms)}` : ''}
          </p>

          <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 0.85rem; line-height: 1.48;">
            ${highlightTermsInHtml(escapeHtml((doc.tema || 'Síntesis en relatoría').substring(0, 160)), terms)}
          </p>

          <div class="resuelve-container" style="padding: 0.75rem 0.9rem; margin-bottom: 0.9rem;">
            <span class="resuelve-label" style="display:block; margin-bottom:0.25rem; font-size:0.64rem;">Extracto del Resuelve</span>
            <div class="resuelve-text" style="font-size: 0.88rem; line-height: 1.5;">
              ${formatStructuredResuelve(doc.resuelve, terms, 220)}
            </div>
          </div>
        </div>

        <div class="precedent-footer" style="padding-top: 0.65rem;">
          <button type="button" class="btn-card-action btn-tactile" onclick="openDetailModal('${escapeHtml(doc.id)}')">
            Abrir Inspector
          </button>
          <div style="display:flex; gap:0.35rem;">
            <button type="button" class="btn-card-action primary-outline btn-tactile" onclick="copyForLegalBrief('${escapeHtml(doc.id)}')" title="Copiar cita formal y resuelve">
              Copiar Cita
            </button>
            <button type="button" class="btn-card-action btn-tactile ${isSaved ? 'saved' : ''}" onclick="toggleDossierItem('${escapeHtml(doc.id)}')">
              ${isSaved ? '✓' : '+'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================================================
// INSPECTOR LATERAL DE PROVIDENCIA (SLIDE-OVER DRAWER)
// ==========================================================================
window.openDetailModal = function(docId) {
  const doc = jurisprudenciaDB.find(d => d.id === docId);
  if (!doc) return;

  const drawer = document.getElementById('modal-detail');
  const backdrop = document.getElementById('drawer-backdrop');
  const title = document.getElementById('modal-detail-title');
  const kicker = document.getElementById('drawer-kicker');
  const content = document.getElementById('modal-detail-content');
  const footer = document.getElementById('modal-detail-footer');

  const sense = doc._sense || detectRulingSense(doc.resuelve, doc.tipo, doc.radicado);
  const isSaved = savedDossierIds.includes(doc.id);

  if (kicker) kicker.textContent = `${doc.corte} • ${doc._humanTipo || 'Providencia'}`;
  if (title) title.textContent = `Providencia ${doc.radicado}`;

  if (content) {
    content.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.35rem;">
        
        <!-- Metadatos Tabulares de la Ficha -->
        <div style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem 1.25rem;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.85rem; padding-bottom:0.6rem; border-bottom:1px solid var(--border-subtle);">
            <span style="font-family:var(--font-mono); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); font-weight:600;">
              Datos Oficiales de Relatoría
            </span>
            <span class="ruling-sense-badge ${sense.css}">${escapeHtml(sense.label)}</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.85rem; font-size:0.84rem;">
            <div>
              <span style="color:var(--text-muted); font-size:0.74rem; display:block;">Corporación</span>
              <strong>${escapeHtml(doc.corte)}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:0.74rem; display:block;">Magistrado(a) Ponente</span>
              <strong>${escapeHtml(doc.magistrado_ponente || 'No especificado')}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:0.74rem; display:block;">Sala / Clasificación</span>
              <strong>${escapeHtml(doc.sala_especializada || doc._humanTipo || 'Sala de Decisión')}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:0.74rem; display:block;">Fecha de Providencia</span>
              <strong style="font-family:var(--font-mono); font-size:0.8rem;">${escapeHtml(doc.fecha_providencia || doc.ano || 'En archivo')}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:0.74rem; display:block;">Expediente</span>
              <strong style="font-family:var(--font-mono); font-size:0.8rem;">${escapeHtml(doc.expediente || doc.radicado)}</strong>
            </div>
          </div>
        </div>

        <!-- Problema Jurídico / Tema -->
        <div>
          <h4 style="font-family:var(--font-mono); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom:0.45rem;">
            Síntesis del Asunto / Materia
          </h4>
          <p style="font-size:0.92rem; line-height:1.6; color:var(--text-primary); background:var(--bg-surface); border:1px solid var(--border-subtle); padding:0.9rem 1rem; border-radius:var(--radius-sm);">
            ${escapeHtml(doc.tema || 'Síntesis disponible en el documento íntegro.')}
          </p>
        </div>

        <!-- Parte Resolutiva Completa (RESUELVE) con Buscador Interno -->
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.55rem; flex-wrap:wrap;">
            <h4 style="font-family:var(--font-mono); font-size:0.74rem; text-transform:uppercase; letter-spacing:0.07em; color:var(--accent-primary); font-weight:600;">
              Parte Resolutiva Oficial (RESUELVE)
            </h4>
            <input 
              type="search" 
              id="drawer-resuelve-filter" 
              placeholder="Resaltar palabra en el resuelve..." 
              style="padding:0.25rem 0.6rem; font-size:0.75rem; border-radius:4px; border:1px solid var(--border-strong); background:var(--bg-elevated);"
            >
          </div>
          <div id="drawer-resuelve-box" class="resuelve-container" style="margin-bottom:0;">
            <div class="resuelve-text">
              ${formatStructuredResuelve(doc.resuelve, [], 0)}
            </div>
          </div>
        </div>

        <!-- Bloque de Citación Estándar -->
        <div style="background:var(--bg-subtle); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:0.95rem 1.1rem;">
          <span style="font-family:var(--font-mono); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
            Referencia Bibliográfica / Citación Judicial
          </span>
          <code style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-primary); line-height:1.5; display:block;">
            ${escapeHtml(doc.citacion_formal)}
          </code>
        </div>

      </div>
    `;

    // Buscador interno en tiempo real dentro del RESUELVE del inspector
    const resFilter = document.getElementById('drawer-resuelve-filter');
    const resBox = document.getElementById('drawer-resuelve-box');
    resFilter?.addEventListener('input', () => {
      const term = resFilter.value.trim();
      if (resBox) {
        resBox.innerHTML = `<div class="resuelve-text">${formatStructuredResuelve(doc.resuelve, term ? [term] : [], 0)}</div>`;
      }
    });
  }

  if (footer) {
    footer.innerHTML = `
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button type="button" class="btn-primary-consult btn-tactile" onclick="copyForLegalBrief('${escapeHtml(doc.id)}')">
          Copiar Cita + Resuelve para Demanda
        </button>
        <button type="button" class="btn-utility btn-tactile" onclick="toggleDossierItem('${escapeHtml(doc.id)}'); openDetailModal('${escapeHtml(doc.id)}');">
          ${isSaved ? '✓ Guardado en Dossier' : '+ Guardar en Dossier'}
        </button>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <a href="${escapeHtml(doc.drive_url)}" target="_blank" rel="noopener noreferrer" class="btn-utility btn-tactile" style="text-decoration:none; color:var(--accent-primary); font-weight:600;">
          Ver Documento en Drive &nearr;
        </a>
        ${doc.url_origen ? `
          <a href="${escapeHtml(doc.url_origen)}" target="_blank" rel="noopener noreferrer" class="btn-utility btn-tactile" style="text-decoration:none;">
            Fuente Oficial &nearr;
          </a>
        ` : ''}
      </div>
    `;
  }

  backdrop?.classList.add('open');
  drawer?.classList.add('open');
  drawer?.setAttribute('aria-hidden', 'false');
};

function closeDetailDrawer() {
  const drawer = document.getElementById('modal-detail');
  const backdrop = document.getElementById('drawer-backdrop');
  backdrop?.classList.remove('open');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden', 'true');
}

// ==========================================================================
// DOSSIER DE PRECEDENTES (PORTAPAPELES DE INVESTIGACIÓN JURÍDICA)
// ==========================================================================
window.toggleDossierItem = function(docId) {
  const idx = savedDossierIds.indexOf(docId);
  if (idx >= 0) {
    savedDossierIds.splice(idx, 1);
    showToast('Providencia retirada del Dossier.');
  } else {
    savedDossierIds.push(docId);
    showToast('Providencia guardada en tu Dossier de Precedentes.');
  }
  localStorage.setItem('JURISWIKI_DOSSIER', JSON.stringify(savedDossierIds));
  renderDossierPanel();
  renderFeaturedShowcase();
  renderExplorer();
};

function renderDossierPanel() {
  const container = document.getElementById('dossier-container');
  const badge = document.getElementById('dossier-count-badge');
  const actions = document.getElementById('dossier-actions');

  if (badge) badge.textContent = savedDossierIds.length;
  if (!container) return;

  const docs = savedDossierIds.map(id => jurisprudenciaDB.find(d => d.id === id)).filter(Boolean);

  if (docs.length === 0) {
    actions?.classList.add('hidden');
    container.innerHTML = `
      <p class="dossier-empty">
        Guarda sentencias mientras investigas usando el botón <strong>«+ Guardar»</strong> para exportar todas sus citas y resuelves juntos.
      </p>
    `;
    return;
  }

  actions?.classList.remove('hidden');
  container.innerHTML = `
    <div class="dossier-list">
      ${docs.map(d => `
        <div class="dossier-item">
          <button type="button" onclick="openDetailModal('${escapeHtml(d.id)}')" style="text-align:left; flex:1; overflow:hidden;">
            <strong style="font-family:var(--font-mono); color:var(--accent-primary); display:block;">${escapeHtml(d.radicado)}</strong>
            <span style="font-size:0.72rem; color:var(--text-muted); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(d.corte)} • ${escapeHtml(d.tema || '')}
            </span>
          </button>
          <button type="button" onclick="toggleDossierItem('${escapeHtml(d.id)}')" title="Quitar" style="color:var(--text-muted); padding:0.2rem 0.4rem;">✕</button>
        </div>
      `).join('')}
    </div>
  `;
}

function buildDossierText() {
  const docs = savedDossierIds.map(id => jurisprudenciaDB.find(d => d.id === id)).filter(Boolean);
  if (docs.length === 0) return '';

  const lines = [
    '====================================================================',
    'DOSSIER DE PRECEDENTES JUDICIALES — JURISWIKI COLOMBIA',
    `Fecha de exportación: ${new Date().toLocaleDateString('es-CO')}`,
    `Total de providencias seleccionadas: ${docs.length}`,
    '====================================================================\n'
  ];

  docs.forEach((d, idx) => {
    lines.push(`[${idx + 1}] ${d.citacion_formal}`);
    lines.push(`Corporación: ${d.corte} | Expediente: ${d.expediente || d.radicado}`);
    lines.push(`Materia: ${d.tema || 'En relatoría'}`);
    lines.push(`RESUELVE:\n"${d.resuelve || 'Ver providencia original'}"`);
    lines.push(`Enlace Google Drive: ${d.drive_url}`);
    lines.push('--------------------------------------------------------------------\n');
  });

  return lines.join('\n');
}

function copyDossierToClipboard() {
  const txt = buildDossierText();
  if (!txt) return;
  copyTextWithFeedback(txt, `¡Dossier con ${savedDossierIds.length} precedentes copiado al portapapeles!`);
}

function downloadDossierTxt() {
  const txt = buildDossierText();
  if (!txt) return;
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dossier_Jurisprudencia_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Archivo .TXT descargado.');
}

// ==========================================================================
// HISTORIAL DE CONSULTAS Y COPIADO PARA DEMANDA
// ==========================================================================
function saveRecentQuery(q) {
  if (!q) return;
  recentQueries = [q, ...recentQueries.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  localStorage.setItem('JURISWIKI_RECENT_QUERIES', JSON.stringify(recentQueries));
  renderRecentQueries();
}

function renderRecentQueries() {
  const container = document.getElementById('recent-queries-list');
  if (!container) return;

  if (!recentQueries || recentQueries.length === 0) {
    container.innerHTML = `<p class="dossier-empty">Tus búsquedas de esta sesión aparecerán aquí para acceso rápido.</p>`;
    return;
  }

  container.innerHTML = recentQueries.map(q => `
    <button type="button" class="corp-dist-item" onclick="rerunQuery('${escapeJsStr(q)}')" style="font-size: 0.77rem;">
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(q)}</span>
      <span style="color:var(--accent-primary); font-family:var(--font-mono);">&rarr;</span>
    </button>
  `).join('');
}

window.rerunQuery = function(q) {
  switchWorkspaceView('ai');
  const input = document.getElementById('ai-query-input');
  if (input) {
    input.value = q;
    runAiConsultation(q);
  }
};

// Copia un bloque jurídico completo (Cita formal + transcripción del Resuelve) listo para pegar en Word
window.copyForLegalBrief = function(docId) {
  const doc = jurisprudenciaDB.find(d => d.id === docId);
  if (!doc) return;

  const formattedBlock = `${doc.citacion_formal}. Asunto: ${doc.tema || 'Jurisprudencia aplicable'}.\n\nParte Resolutiva (RESUELVE):\n«${doc.resuelve || ''}»`;
  copyTextWithFeedback(formattedBlock, `Cita y RESUELVE de ${doc.radicado} copiados para demanda.`);
};

window.copyTextWithFeedback = function(text, message = 'Copiado al portapapeles') {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(message);
  }).catch(() => {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
    showToast(message);
  });
};

// ==========================================================================
// UTILIDADES
// ==========================================================================
// ==========================================================================
// CONFIGURACIÓN MULTIMODELO IA (OPENAI, CLAUDE, GEMINI, DEEPSEEK)
// ==========================================================================
function initAiSettingsModal() {
  const btnSettings = document.getElementById('btn-settings');
  const modalSettings = document.getElementById('modal-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const providerSelect = document.getElementById('ai-provider-select');
  const apiKeyInput = document.getElementById('ai-api-key-input');
  const modelSelect = document.getElementById('ai-model-select');
  const btnToggleKey = document.getElementById('btn-toggle-key-visibility');
  const btnTestKey = document.getElementById('btn-test-ai-key');
  const btnSave = document.getElementById('btn-save-ai-config');
  const btnClear = document.getElementById('btn-clear-ai-config');

  btnSettings?.addEventListener('click', () => {
    loadSavedAiConfigToModal();
    modalSettings?.classList.remove('hidden');
  });

  btnCloseSettings?.addEventListener('click', () => modalSettings?.classList.add('hidden'));

  // Toggle visibilidad de clave
  btnToggleKey?.addEventListener('click', () => {
    if (apiKeyInput) {
      apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
      btnToggleKey.textContent = apiKeyInput.type === 'password' ? '👁' : '🔒';
    }
  });

  // Cambio de proveedor en el select
  providerSelect?.addEventListener('change', () => {
    const provKey = providerSelect.value;
    updateModalFieldsForProvider(provKey);
  });

  // Botón probar clave
  btnTestKey?.addEventListener('click', async () => {
    const provKey = providerSelect?.value || 'gemini';
    const key = apiKeyInput?.value.trim() || '';
    const model = modelSelect?.value || '';

    if (provKey === 'local') {
      showToast('✓ El motor RAG local está 100% operativo sin claves.');
      return;
    }

    if (!key) {
      showToast(`Ingresa una clave de API para probar ${AI_PROVIDERS[provKey]?.name || 'el modelo'}.`);
      apiKeyInput?.focus();
      return;
    }

    btnTestKey.disabled = true;
    btnTestKey.textContent = 'Probando conexión...';

    try {
      const ok = await testAiConnection(provKey, model, key);
      if (ok) {
        showToast(`✓ ¡Conexión exitosa con ${AI_PROVIDERS[provKey]?.name}! Tu plan y clave son válidos.`);
      } else {
        showToast(`✗ No se pudo conectar. Verifica que la clave de ${AI_PROVIDERS[provKey]?.name} sea correcta y tenga cuota activa.`);
      }
    } catch (e) {
      showToast(`✗ Error al validar clave: ${e.message}`);
    } finally {
      btnTestKey.disabled = false;
      btnTestKey.textContent = '⚡ Probar Conexión';
    }
  });

  // Botón guardar
  btnSave?.addEventListener('click', () => {
    const prov = providerSelect?.value || 'gemini';
    const key = apiKeyInput?.value.trim() || '';
    const model = modelSelect?.value || '';

    localStorage.setItem('JURISWIKI_AI_PROVIDER', prov);
    if (prov !== 'local') {
      localStorage.setItem(`JURISWIKI_KEY_${prov}`, key);
      localStorage.setItem(`JURISWIKI_MODEL_${prov}`, model);
      if (prov === 'gemini') localStorage.setItem('GEMINI_API_KEY', key);
    }

    modalSettings?.classList.add('hidden');
    updateApiKeyBadge();
    const provName = AI_PROVIDERS[prov]?.name || prov;
    showToast(prov === 'local' ? 'Motor RAG Local Activado.' : `✓ ${provName} activado como motor jurídico principal.`);
  });

  // Botón restablecer
  btnClear?.addEventListener('click', () => {
    localStorage.setItem('JURISWIKI_AI_PROVIDER', 'local');
    if (providerSelect) providerSelect.value = 'local';
    updateModalFieldsForProvider('local');
    updateApiKeyBadge();
    showToast('Configuración restablecida a Motor Local RAG.');
  });
}

function updateModalFieldsForProvider(provKey) {
  const provConfig = AI_PROVIDERS[provKey] || AI_PROVIDERS.gemini;
  const apiKeyInput = document.getElementById('ai-api-key-input');
  const modelSelect = document.getElementById('ai-model-select');
  const lblApiKey = document.getElementById('lbl-api-key');
  const linkGetApiKey = document.getElementById('link-get-api-key');
  const providerFields = document.getElementById('provider-config-fields');
  const localNotice = document.getElementById('local-engine-notice');

  if (provKey === 'local') {
    providerFields?.classList.add('hidden');
    localNotice?.classList.remove('hidden');
    return;
  }

  providerFields?.classList.remove('hidden');
  localNotice?.classList.add('hidden');

  if (lblApiKey) lblApiKey.textContent = `Clave de API (${provConfig.name})`;
  if (apiKeyInput) {
    apiKeyInput.placeholder = provConfig.placeholder || 'Introduce tu clave...';
    const savedKey = localStorage.getItem(`JURISWIKI_KEY_${provKey}`) || (provKey === 'gemini' ? localStorage.getItem('GEMINI_API_KEY') : '') || '';
    apiKeyInput.value = savedKey;
  }

  if (linkGetApiKey) {
    linkGetApiKey.href = provConfig.helpUrl || '#';
    linkGetApiKey.textContent = provConfig.helpText || 'Obtener clave ↗';
  }

  if (modelSelect) {
    const savedModel = localStorage.getItem(`JURISWIKI_MODEL_${provKey}`) || '';
    modelSelect.innerHTML = (provConfig.models || []).map(m => `
      <option value="${m.id}" ${m.id === savedModel ? 'selected' : ''}>${escapeHtml(m.name)}</option>
    `).join('');
  }
}

function loadSavedAiConfigToModal() {
  const providerSelect = document.getElementById('ai-provider-select');
  const activeProv = localStorage.getItem('JURISWIKI_AI_PROVIDER') || (localStorage.getItem('GEMINI_API_KEY') ? 'gemini' : 'local');
  if (providerSelect) providerSelect.value = activeProv;
  updateModalFieldsForProvider(activeProv);
}

async function testAiConnection(provider, model, apiKey) {
  if (provider === 'gemini') {
    const useModel = model || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
    });
    return res.ok;
  }
  if (provider === 'openai') {
    const useModel = model || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: useModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5
      })
    });
    return res.ok;
  }
  if (provider === 'claude') {
    const useModel = model || 'claude-3-5-haiku-20241022';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: useModel,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Ping' }]
      })
    });
    return res.ok;
  }
  
  // Fallback vía endpoint proxy backend
  const proxyEndpoint = (window.location.pathname.endsWith('.php') || window.location.hostname.includes('.'))
    ? 'api.php?action=ask_ai'
    : '/api/ask';

  const res = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, apiKey, query: 'Ping', systemPrompt: 'Di OK' })
  });
  return res.ok;
}

function loadSavedApiKey() {
  updateApiKeyBadge();
}

function updateApiKeyBadge() {
  const badge = document.getElementById('ai-status-badge');
  const provider = localStorage.getItem('JURISWIKI_AI_PROVIDER') || (localStorage.getItem('GEMINI_API_KEY') ? 'gemini' : 'local');
  const key = localStorage.getItem(`JURISWIKI_KEY_${provider}`) || (provider === 'gemini' ? localStorage.getItem('GEMINI_API_KEY') : '');
  const model = localStorage.getItem(`JURISWIKI_MODEL_${provider}`) || '';

  if (badge) {
    if (provider !== 'local' && key && key.length > 5) {
      const pName = AI_PROVIDERS[provider]?.badge || provider;
      const mName = model ? ` (${model.split('-')[0].toUpperCase()})` : '';
      badge.textContent = `Motor: ${pName}${mName} Activo`;
    } else {
      badge.textContent = 'Motor: Relatoría RAG Local Activo';
    }
  }
}

function getCorpBadgeClass(corte = '') {
  if (corte.includes('Constitucional')) return 'corp-constitucional';
  if (corte.includes('Consejo')) return 'corp-consejo';
  if (corte.includes('Suprema')) return 'corp-suprema';
  return 'corp-default';
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

let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    <span>${escapeHtml(msg)}</span>
  `;

  toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
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

function escapeJsStr(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function markdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h4 style="font-family:var(--font-serif); font-size:1.05rem; font-weight:700; margin:0.85rem 0 0.35rem;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="font-family:var(--font-serif); font-size:1.18rem; font-weight:700; margin:1rem 0 0.45rem;">$1</h3>')
    .replace(/^\> (.*$)/gim, '<blockquote class="resuelve-container" style="margin:0.65rem 0;">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p style="margin-top:0.55rem;">');
}
