// ==========================================
// MATRIX Intelligence — Campagne & Target
// ==========================================
// Una Campagna promuove un VOLUME specifico di una materia.
// Flusso: Seleziona/inserisci volume → Verifica risorse (Scenario A/B/C) → Genera target

let allCampaigns = [];
let currentTargets = [];
let currentCampaignId = null;

// --- Catalogo MATRIX ---
let catalogData = null;
let catalogManuals = [];

// --- Framework di valutazione ---
let frameworkData = null;
let allFrameworks = [];

// ===================================================
// CARICAMENTO RISORSE (Catalogo + Framework)
// ===================================================

async function loadCatalog() {
  if (catalogData) return;
  try {
    const response = await fetch('/static/data/catalogo_manuali.json');
    if (!response.ok) throw new Error('Catalogo non trovato');
    catalogData = await response.json();
    catalogManuals = catalogData.manuals || [];
    console.log(`Catalogo manuali caricato: ${catalogManuals.length} manuali`);
  } catch (e) {
    console.error('Errore caricamento catalogo:', e);
  }
}

async function loadFrameworks() {
  if (frameworkData) return;
  try {
    const response = await fetch('/static/data/catalogo_framework.json');
    if (!response.ok) throw new Error('Framework non trovati');
    frameworkData = await response.json();
    allFrameworks = frameworkData.frameworks || [];
    console.log(`Framework caricati: ${allFrameworks.length}`);
  } catch (e) {
    console.error('Errore caricamento framework:', e);
  }
}

function findFrameworkForSubject(materia) {
  if (!allFrameworks.length || !materia) return null;
  const materiaLower = materia.toLowerCase();
  
  let best = null;
  for (const fw of allFrameworks) {
    const fwSubject = fw.subject.toLowerCase();
    const fwName = fw.name.toLowerCase();
    
    if (fwSubject === materiaLower || fwName === materiaLower) {
      if (!best || fw.syllabus_modules.length > best.syllabus_modules.length) {
        best = fw;
      }
    } else if (fwSubject.includes(materiaLower) || materiaLower.includes(fwSubject)) {
      if (!best) best = fw;
    }
  }
  return best;
}

function findManualsForSubject(materia) {
  if (!catalogManuals.length || !materia) return [];
  return catalogManuals.filter(m => checkSubjectMatch(m.subject, materia));
}

// ===================================================
// TOGGLE CATALOGO MATRIX (pannello importazione)
// ===================================================

function toggleCatalogImport() {
  const panel = document.getElementById('catalog-import-panel');
  if (!panel) return;
  
  const isHidden = panel.classList.contains('hidden');
  
  if (isHidden) {
    panel.classList.remove('hidden');
    // Carica catalogo e popola selettore
    loadCatalog().then(() => populateCatalogSelector());
  } else {
    panel.classList.add('hidden');
  }
}

// ===================================================
// POPOLA CATALOGO NEL SELETTORE
// ===================================================

function populateCatalogSelector() {
  if (!catalogManuals.length) return;
  
  const subjectFilter = document.getElementById('catalog-subject-filter');
  if (subjectFilter && catalogData?.subjects) {
    // Svuota prima le opzioni esistenti (tranne la prima)
    while (subjectFilter.options.length > 1) subjectFilter.remove(1);
    
    const subjects = Object.keys(catalogData.subjects).sort();
    subjects.forEach(subj => {
      const counts = catalogData.subjects[subj];
      const opt = document.createElement('option');
      opt.value = subj;
      opt.textContent = `${subj} (${counts.total})`;
      subjectFilter.appendChild(opt);
    });
  }
  
  const countEl = document.getElementById('catalog-count');
  if (countEl) countEl.textContent = `${catalogManuals.length} manuali`;
  
  filterCatalogManuals();
}

function filterCatalogManuals() {
  if (!catalogManuals.length) return;
  
  const subjectFilter = document.getElementById('catalog-subject-filter')?.value || '';
  const publisherFilter = document.getElementById('catalog-publisher-filter')?.value || '';
  const searchText = (document.getElementById('catalog-search')?.value || '').toLowerCase().trim();
  
  let filtered = [...catalogManuals];
  
  if (subjectFilter) {
    filtered = filtered.filter(m => m.subject === subjectFilter);
  }
  if (publisherFilter === 'zanichelli') {
    filtered = filtered.filter(m => m.is_zanichelli);
  } else if (publisherFilter === 'competitor') {
    filtered = filtered.filter(m => !m.is_zanichelli);
  }
  if (searchText) {
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(searchText) ||
      m.author.toLowerCase().includes(searchText) ||
      m.id.toLowerCase().includes(searchText)
    );
  }
  
  const select = document.getElementById('catalog-manual-select');
  if (!select) return;
  
  select.innerHTML = `<option value="">— Seleziona (${filtered.length} risultati) —</option>`;
  filtered.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    const badge = m.is_zanichelli ? ' [Z]' : '';
    opt.textContent = `${m.title} — ${m.author} (${m.publisher})${badge}`;
    select.appendChild(opt);
  });
}

function selectManualFromCatalog() {
  const select = document.getElementById('catalog-manual-select');
  const manualId = select?.value;
  
  if (!manualId) {
    clearCatalogSelection();
    return;
  }
  
  const manual = catalogManuals.find(m => m.id === manualId);
  if (!manual) return;
  
  // Auto-compila i campi del form
  document.getElementById('camp-titolo').value = manual.title;
  document.getElementById('camp-autore').value = manual.author;
  document.getElementById('camp-editore').value = manual.publisher;
  document.getElementById('camp-materia').value = manual.subject;
  
  if (manual.chapters_summary) {
    document.getElementById('camp-indice').value = manual.chapters_summary;
    const badge = document.getElementById('indice-source-badge');
    if (badge) badge.classList.remove('hidden');
  }
  
  document.getElementById('camp-temi').value = '';
  
  // Mostra info manuale selezionato
  const infoBox = document.getElementById('catalog-selected-info');
  if (infoBox) {
    infoBox.classList.remove('hidden');
    document.getElementById('catalog-selected-title').textContent = manual.title;
    document.getElementById('catalog-selected-meta').textContent =
      `${manual.author} — ${manual.publisher} — ${manual.subject}`;
    document.getElementById('catalog-selected-chapters').textContent =
      `${manual.chapters_count} capitoli caricati dal catalogo MATRIX`;
  }
  
  showToast(`Manuale "${manual.title}" selezionato dal catalogo!`, 'success');
  
  // Aggiorna scenario A/B/C con la materia del manuale selezionato
  onMateriaChange();
}

function clearCatalogSelection() {
  const select = document.getElementById('catalog-manual-select');
  if (select) select.value = '';
  
  const infoBox = document.getElementById('catalog-selected-info');
  if (infoBox) infoBox.classList.add('hidden');
  
  const badge = document.getElementById('indice-source-badge');
  if (badge) badge.classList.add('hidden');
  
  // NON resettare i campi del form — l'utente potrebbe aver digitato a mano
  // Resetta solo se chiamato esplicitamente dal pulsante "Rimuovi"
}

// ===================================================
// RILEVAMENTO SCENARIO A/B/C
// ===================================================

async function detectScenario(materia) {
  await loadCatalog();
  await loadFrameworks();
  
  const framework = findFrameworkForSubject(materia);
  const manuali = findManualsForSubject(materia);
  
  let scenario, scenarioLabel, scenarioColor;
  
  if (framework && manuali.length > 0) {
    scenario = 'A';
    scenarioLabel = 'Completo';
    scenarioColor = 'green';
  } else if (framework && manuali.length === 0) {
    scenario = 'B';
    scenarioLabel = 'Parziale';
    scenarioColor = 'yellow';
  } else if (!framework && manuali.length > 0) {
    // Ha manuali ma non il framework
    scenario = 'B';
    scenarioLabel = 'Parziale';
    scenarioColor = 'yellow';
  } else {
    scenario = 'C';
    scenarioLabel = 'Base';
    scenarioColor = 'orange';
  }
  
  return {
    scenario,
    scenarioLabel,
    scenarioColor,
    framework,
    frameworkModules: framework ? framework.syllabus_modules.length : 0,
    frameworkProfiles: framework ? framework.program_profiles.length : 0,
    frameworkConcepts: framework ? framework.syllabus_modules.reduce((sum, m) => sum + (m.key_concepts || []).length, 0) : 0,
    manuali,
    manualiCount: manuali.length,
    manualiZanichelli: manuali.filter(m => m.is_zanichelli).length,
    manualiCompetitor: manuali.filter(m => !m.is_zanichelli).length,
    hasFramework: !!framework,
    hasManuali: manuali.length > 0
  };
}

function renderScenarioPanel(scenarioInfo) {
  const panel = document.getElementById('scenario-panel');
  if (!panel) return;
  
  const { scenario, framework, frameworkModules, frameworkProfiles, frameworkConcepts,
          manualiCount, manualiZanichelli, manualiCompetitor, hasFramework, hasManuali } = scenarioInfo;
  
  // Framework status
  const fwStatus = hasFramework
    ? `<div class="flex items-center gap-2 flex-wrap">
         <i class="fas fa-check-circle text-green-500"></i>
         <span class="text-green-700 font-medium">Presente</span>
         <span class="text-xs text-gray-500">(${frameworkModules} moduli, ${frameworkConcepts} concetti, ${frameworkProfiles} profili classe)</span>
       </div>`
    : `<div class="flex items-center gap-2 flex-wrap">
         <i class="fas fa-times-circle text-red-400"></i>
         <span class="text-red-600 font-medium">Non presente</span>
         <button onclick="showUploadFramework()" class="ml-2 text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
           <i class="fas fa-upload mr-1"></i>Carica framework JSON
         </button>
       </div>`;
  
  // Manuali status
  const manStatus = hasManuali
    ? `<div class="flex items-center gap-2 flex-wrap">
         <i class="fas fa-check-circle text-green-500"></i>
         <span class="text-green-700 font-medium">Presente</span>
         <span class="text-xs text-gray-500">(${manualiCount} manuali: ${manualiZanichelli} Zanichelli, ${manualiCompetitor} competitor)</span>
       </div>`
    : `<div class="flex items-center gap-2 flex-wrap">
         <i class="fas fa-times-circle text-red-400"></i>
         <span class="text-red-600 font-medium">Non presente</span>
         <button onclick="showUploadManuals()" class="ml-2 text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
           <i class="fas fa-upload mr-1"></i>Carica manuali JSON
         </button>
       </div>`;
  
  // Colori scenario
  const scenarioColors = {
    A: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: 'fa-check-double' },
    B: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: 'fa-exclamation-triangle' },
    C: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: 'fa-exclamation-circle' }
  };
  const colors = scenarioColors[scenario];
  
  // Capacita di analisi per scenario
  const analysisCapabilities = {
    A: [
      { icon: 'fa-check', color: 'text-green-500', text: 'Analisi qualitativa programma (moduli forti/deboli/assenti)' },
      { icon: 'fa-check', color: 'text-green-500', text: 'Gap analysis manuale adottato vs framework' },
      { icon: 'fa-check', color: 'text-green-500', text: 'Matching completo con priorita e motivazioni personalizzate' }
    ],
    B: [
      { icon: 'fa-check', color: 'text-green-500', text: hasFramework ? 'Analisi qualitativa programma con framework' : 'Confronto con manuali del catalogo' },
      { icon: 'fa-minus', color: 'text-yellow-500', text: hasFramework ? 'Identificazione manuali citati (senza gap analysis dettagliata)' : 'Analisi base senza framework disciplinare' },
      { icon: 'fa-check', color: 'text-green-500', text: 'Matching con priorita basata su scenario Zanichelli' }
    ],
    C: [
      { icon: 'fa-minus', color: 'text-orange-500', text: 'Estrazione base dati (docente, ateneo, temi, manuali citati)' },
      { icon: 'fa-times', color: 'text-red-400', text: 'Nessuna analisi qualitativa approfondita disponibile' },
      { icon: 'fa-minus', color: 'text-orange-500', text: 'Matching basico (solo materia + scenario Zanichelli)' }
    ]
  };
  
  const capabilitiesHtml = analysisCapabilities[scenario].map(c =>
    `<li class="flex items-start gap-2 text-sm">
       <i class="fas ${c.icon} ${c.color} w-4 text-center mt-0.5"></i>
       <span class="text-gray-700">${c.text}</span>
     </li>`
  ).join('');
  
  // Note informative
  let noteHtml = '';
  if (scenario === 'B' || scenario === 'C') {
    noteHtml = `
      <div class="mt-3 p-3 bg-white/60 rounded-lg border ${colors.border}">
        <p class="text-xs text-gray-600">
          <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
          <strong>Puoi procedere comunque:</strong> l'analisi funziona anche senza tutte le risorse, 
          ma sara meno dettagliata. Puoi caricare le risorse mancanti in qualsiasi momento per migliorare i risultati.
        </p>
      </div>`;
  }
  
  panel.innerHTML = `
    <div class="${colors.bg} ${colors.border} border rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-semibold text-gray-800">
          <i class="fas fa-clipboard-check mr-2"></i>Stato Risorse per questa Materia
        </h4>
        <span class="px-3 py-1 ${colors.badge} rounded-full text-sm font-medium">
          <i class="fas ${colors.icon} mr-1"></i>Scenario ${scenario} — ${scenarioInfo.scenarioLabel}
        </span>
      </div>
      
      <div class="space-y-3 mb-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span class="text-sm text-gray-600 font-medium sm:w-52 shrink-0">Framework di valutazione:</span>
          ${fwStatus}
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span class="text-sm text-gray-600 font-medium sm:w-52 shrink-0">Database manuali:</span>
          ${manStatus}
        </div>
      </div>
      
      <div class="border-t ${colors.border} pt-3">
        <p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Capacita di analisi:</p>
        <ul class="space-y-1.5">${capabilitiesHtml}</ul>
      </div>
      ${noteHtml}
    </div>`;
  
  panel.classList.remove('hidden');
}

// ===================================================
// UPLOAD FRAMEWORK / MANUALI (colmare gap)
// ===================================================

function showUploadFramework() {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  
  content.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="fas fa-upload mr-2 text-zanichelli-light"></i>
        Carica Framework di Valutazione
      </h3>
      <p class="text-sm text-gray-600">
        Carica un file JSON con il framework di valutazione dalla cartella <code class="bg-gray-100 px-1 rounded">frameworks/</code> del repository MATRIX.
        Il framework deve contenere <code class="bg-gray-100 px-1 rounded">syllabus_modules</code> con <code class="bg-gray-100 px-1 rounded">key_concepts</code>.
      </p>
      <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-zanichelli-light hover:bg-zanichelli-accent/20 transition-all"
           onclick="document.getElementById('fw-file-input').click()">
        <i class="fas fa-file-code text-4xl text-gray-300 mb-3"></i>
        <p class="text-gray-600 font-medium">Clicca per selezionare il file JSON</p>
        <p class="text-xs text-gray-400 mt-1">Formato: JSON del framework MATRIX</p>
        <input type="file" id="fw-file-input" accept=".json" class="hidden" onchange="handleFrameworkUpload(event)">
      </div>
      <div id="fw-upload-status"></div>
    </div>`;
  
  modal.classList.remove('hidden');
}

async function handleFrameworkUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const statusEl = document.getElementById('fw-upload-status');
  statusEl.innerHTML = '<div class="text-sm text-blue-600"><i class="fas fa-spinner fa-spin mr-1"></i>Caricamento in corso...</div>';
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const content = data.content || data;
    
    if (!content.syllabus_modules || !Array.isArray(content.syllabus_modules)) {
      throw new Error('Il file non contiene syllabus_modules validi. Verifica che sia un framework MATRIX.');
    }
    
    const fwName = file.name.replace('.json', '');
    const materia = document.getElementById('camp-materia')?.value || fwName;
    
    const newFw = {
      id: fwName.toLowerCase().replace(/\s+/g, '_'),
      name: fwName,
      subject: materia,
      program_profiles: content.program_profiles || [],
      syllabus_modules: content.syllabus_modules.map(m => ({
        name: m.name || '',
        core_contents: m.core_contents || '',
        key_concepts: m.key_concepts || []
      }))
    };
    
    // Evita duplicati
    const existingIdx = allFrameworks.findIndex(f => f.id === newFw.id);
    if (existingIdx >= 0) {
      allFrameworks[existingIdx] = newFw;
    } else {
      allFrameworks.push(newFw);
    }
    
    const concepts = newFw.syllabus_modules.reduce((sum, m) => sum + (m.key_concepts || []).length, 0);
    statusEl.innerHTML = `
      <div class="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
        <i class="fas fa-check-circle mr-1"></i>
        Framework "<strong>${fwName}</strong>" caricato con successo!<br>
        <span class="text-xs text-gray-500">${newFw.syllabus_modules.length} moduli, ${concepts} concetti, ${newFw.program_profiles.length} profili classe</span>
      </div>`;
    
    // Riaggiorna il pannello scenario
    await refreshScenarioPanel();
    
    showToast('Framework caricato! Lo scenario e stato aggiornato.', 'success');
    setTimeout(() => closeModal(), 2000);
    
  } catch (e) {
    statusEl.innerHTML = `<div class="text-sm text-red-600 bg-red-50 p-3 rounded-lg"><i class="fas fa-exclamation-circle mr-1"></i>${e.message}</div>`;
  }
}

function showUploadManuals() {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  
  content.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="fas fa-upload mr-2 text-zanichelli-light"></i>
        Carica Database Manuali
      </h3>
      <p class="text-sm text-gray-600">
        Carica uno o piu file JSON dalla cartella <code class="bg-gray-100 px-1 rounded">manuali/</code> del repository MATRIX.
        Ogni file deve contenere <code class="bg-gray-100 px-1 rounded">title</code>, <code class="bg-gray-100 px-1 rounded">author</code>, <code class="bg-gray-100 px-1 rounded">publisher</code> e <code class="bg-gray-100 px-1 rounded">chapters</code>.
      </p>
      <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-zanichelli-light hover:bg-zanichelli-accent/20 transition-all"
           onclick="document.getElementById('man-file-input').click()">
        <i class="fas fa-book text-4xl text-gray-300 mb-3"></i>
        <p class="text-gray-600 font-medium">Clicca per selezionare i file JSON</p>
        <p class="text-xs text-gray-400 mt-1">Selezione multipla supportata</p>
        <input type="file" id="man-file-input" accept=".json" multiple class="hidden" onchange="handleManualsUpload(event)">
      </div>
      <div id="man-upload-status"></div>
    </div>`;
  
  modal.classList.remove('hidden');
}

async function handleManualsUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  
  const statusEl = document.getElementById('man-upload-status');
  statusEl.innerHTML = `<div class="text-sm text-blue-600"><i class="fas fa-spinner fa-spin mr-1"></i>Caricamento ${files.length} file...</div>`;
  
  let loaded = 0;
  let errors = 0;
  let duplicates = 0;
  
  for (const file of files) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.title || !data.chapters) {
        errors++;
        continue;
      }
      
      const manual = {
        id: data.id || file.name.replace('.json', ''),
        title: data.title,
        author: data.author || '',
        publisher: data.publisher || '',
        subject: data.subject || '',
        is_zanichelli: (data.publisher === 'Zanichelli') || (data.type === 'zanichelli'),
        chapters_count: data.chapters.length,
        chapters_summary: data.chapters.map(ch => `${ch.number || ''}: ${ch.title || ''}`).join('\n'),
        temi_chiave: data.chapters.map(ch => `${ch.number || ''}: ${ch.title || ''}`)
      };
      
      // Evita duplicati
      if (catalogManuals.find(m => m.id === manual.id)) {
        duplicates++;
        continue;
      }
      
      catalogManuals.push(manual);
      loaded++;
    } catch (e) {
      errors++;
    }
  }
  
  let statusMsg = `${loaded} manuali caricati`;
  if (duplicates > 0) statusMsg += `, ${duplicates} gia presenti`;
  if (errors > 0) statusMsg += `, ${errors} errori`;
  
  statusEl.innerHTML = `
    <div class="text-sm ${loaded > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} p-3 rounded-lg">
      <i class="fas ${loaded > 0 ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1"></i>
      ${statusMsg}<br>
      <span class="text-xs text-gray-500">Totale catalogo: ${catalogManuals.length} manuali</span>
    </div>`;
  
  // Riaggiorna scenario
  await refreshScenarioPanel();
  
  showToast(`${loaded} manuali caricati!`, 'success');
  setTimeout(() => closeModal(), 2000);
}

// Aggiorna il pannello scenario con la materia corrente
async function refreshScenarioPanel() {
  const materia = document.getElementById('camp-materia')?.value?.trim();
  if (materia) {
    const scenarioInfo = await detectScenario(materia);
    renderScenarioPanel(scenarioInfo);
  }
}

// ===================================================
// MATERIA CHANGE → Aggiorna Scenario
// ===================================================

let _materiaDebounce = null;
function onMateriaChange() {
  clearTimeout(_materiaDebounce);
  _materiaDebounce = setTimeout(async () => {
    const materia = document.getElementById('camp-materia')?.value?.trim();
    if (!materia || materia.length < 3) {
      const panel = document.getElementById('scenario-panel');
      if (panel) panel.classList.add('hidden');
      return;
    }
    
    const scenarioInfo = await detectScenario(materia);
    renderScenarioPanel(scenarioInfo);
  }, 500);
}

// ===================================================
// GESTIONE CAMPAGNE (CRUD)
// ===================================================

async function loadCampaigns() {
  if (!supabaseClient) return;
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  
  // Carica risorse in parallelo
  loadCatalog();
  loadFrameworks();
  
  try {
    const { data, error } = await supabaseClient
      .from('campagne')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    allCampaigns = data || [];
    renderCampaignsList();
  } catch (e) {
    showToast('Errore caricamento campagne: ' + e.message, 'error');
  }
}

function renderCampaignsList() {
  const container = document.getElementById('campaigns-list');
  
  if (allCampaigns.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <i class="fas fa-bullseye text-4xl mb-3 block"></i>
        <p>Nessuna campagna creata</p>
        <p class="text-sm mt-1">Crea la tua prima campagna promozionale per generare liste target</p>
      </div>`;
    return;
  }
  
  container.innerHTML = allCampaigns.map(c => {
    const targetCount = (c.target_generati || []).length;
    
    // Badge stato: determina visivamente se e pre-valutazione dal contenuto
    const isPreVal = c.stato === 'bozza' && (c.target_generati || []).length > 0;
    let statusBadge;
    if (c.stato === 'completata') {
      statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><i class="fas fa-check-circle mr-1"></i>Completa</span>';
    } else if (isPreVal) {
      statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><i class="fas fa-search mr-1"></i>Pre-valutazione</span>';
    } else {
      statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><i class="fas fa-edit mr-1"></i>Bozza</span>';
    }
    
    // Pre-valutazione? Mostra hint per completare
    const preValHint = isPreVal
      ? `<div class="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
           <i class="fas fa-lightbulb"></i>
           Aggiungi l'indice del volume per motivazioni personalizzate
         </div>` : '';
    
    // Bottoni azioni
    let actionButtons = '';
    if (targetCount > 0) {
      actionButtons += `
        <button onclick="viewTargets('${c.id}')" class="px-3 py-1.5 bg-zanichelli-accent text-zanichelli-blue rounded-lg text-sm hover:bg-blue-100 transition-colors" title="Vedi target">
          <i class="fas fa-list mr-1"></i>Target
        </button>`;
    }
    // Se pre-valutazione -> bottone "Completa" per aggiungere indice
    if (isPreVal) {
      actionButtons += `
        <button onclick="showCompleteCampaign('${c.id}')" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors" title="Aggiungi indice e rigenera">
          <i class="fas fa-plus-circle mr-1"></i>Completa
        </button>`;
    }
    if (targetCount === 0 && !isPreVal) {
      actionButtons += `
        <button onclick="generateTargets('${c.id}')" class="px-3 py-1.5 bg-zanichelli-blue text-white rounded-lg text-sm hover:bg-zanichelli-dark transition-colors" title="Genera target">
          <i class="fas fa-magic mr-1"></i>Genera
        </button>`;
    }
    // Rigenera per campagne completate
    if (c.stato === 'completata' && targetCount > 0) {
      actionButtons += `
        <button onclick="generateTargets('${c.id}')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors" title="Rigenera target">
          <i class="fas fa-sync-alt mr-1"></i>
        </button>`;
    }
    
    return `
      <div class="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-1">
              <h3 class="font-semibold text-gray-800">${c.libro_titolo || 'Campagna senza titolo'}</h3>
              ${statusBadge}
            </div>
            <p class="text-sm text-gray-500">${c.libro_autore || ''} ${c.libro_editore ? '— ' + c.libro_editore : ''}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span><i class="fas fa-tag mr-1"></i>${c.libro_materia || '—'}</span>
              <span><i class="fas fa-users mr-1"></i>${targetCount} target</span>
              <span><i class="fas fa-calendar mr-1"></i>${formatDate(c.created_at)}</span>
            </div>
            ${preValHint}
          </div>
          <div class="flex items-center gap-2 ml-4">
            ${actionButtons}
            <button onclick="deleteCampaign('${c.id}')" class="text-gray-400 hover:text-red-500 p-1" title="Elimina">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// === COMPLETA CAMPAGNA (Aggiungi indice a pre-valutazione) ===
function showCompleteCampaign(campaignId) {
  const campaign = allCampaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  
  content.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="fas fa-plus-circle mr-2 text-blue-600"></i>
        Completa Campagna: ${campaign.libro_titolo}
      </h3>
      <p class="text-sm text-gray-600">
        La campagna e in modalita <strong>Pre-valutazione</strong> (target basati solo su materia e scenario).
        Aggiungi l'indice del volume per ottenere motivazioni personalizzate con IA.
      </p>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Indice / Sommario del volume</label>
        <textarea id="complete-indice" rows="8"
                  class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                  placeholder="Incolla qui l'indice del libro (capitoli principali)...">${campaign.libro_indice || ''}</textarea>
      </div>
      
      <div>
        <button type="button" onclick="toggleCatalogImportForComplete('${campaignId}')" 
                class="text-xs text-zanichelli-light hover:text-zanichelli-blue font-medium transition-colors">
          <i class="fas fa-book-open mr-1"></i>Importa dal catalogo MATRIX
        </button>
        <div id="complete-catalog-panel" class="hidden mt-3 bg-zanichelli-accent rounded-xl p-4 border border-blue-200">
          <select id="complete-catalog-select" onchange="selectManualForComplete()" 
                  class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white">
            <option value="">— Seleziona manuale dal catalogo —</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Temi chiave (opzionale, separati da virgola)</label>
        <input type="text" id="complete-temi" value="${(campaign.libro_temi || []).join(', ')}"
               class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
               placeholder="Generati automaticamente dall'indice">
      </div>
      
      <div class="flex gap-3 pt-2">
        <button onclick="handleCompleteCampaign('${campaignId}')" 
                class="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          <i class="fas fa-rocket mr-1"></i>Salva e Rigenera Target
        </button>
        <button onclick="closeModal()" class="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
          Annulla
        </button>
      </div>
    </div>`;
  
  modal.classList.remove('hidden');
}

async function toggleCatalogImportForComplete(campaignId) {
  const panel = document.getElementById('complete-catalog-panel');
  if (!panel) return;
  
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    await loadCatalog();
    const select = document.getElementById('complete-catalog-select');
    select.innerHTML = '<option value="">— Seleziona manuale dal catalogo —</option>';
    catalogManuals.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      const badge = m.is_zanichelli ? ' [Z]' : '';
      opt.textContent = `${m.title} — ${m.author}${badge}`;
      select.appendChild(opt);
    });
  } else {
    panel.classList.add('hidden');
  }
}

function selectManualForComplete() {
  const select = document.getElementById('complete-catalog-select');
  const manualId = select?.value;
  if (!manualId) return;
  
  const manual = catalogManuals.find(m => m.id === manualId);
  if (!manual) return;
  
  const indiceEl = document.getElementById('complete-indice');
  if (indiceEl && manual.chapters_summary) {
    indiceEl.value = manual.chapters_summary;
  }
}

async function handleCompleteCampaign(campaignId) {
  const indice = document.getElementById('complete-indice')?.value?.trim() || null;
  const temiInput = document.getElementById('complete-temi')?.value || '';
  const temi = temiInput ? temiInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  if (!indice && temi.length === 0) {
    showToast('Aggiungi almeno l\'indice o dei temi chiave', 'warning');
    return;
  }
  
  try {
    await supabaseClient.from('campagne').update({
      libro_indice: indice,
      libro_temi: temi.length > 0 ? temi : null, // reset temi per rigenerarli dall'indice
      stato: 'bozza',
      updated_at: new Date().toISOString()
    }).eq('id', campaignId);
    
    // Aggiorna in memoria
    const campaign = allCampaigns.find(c => c.id === campaignId);
    if (campaign) {
      campaign.libro_indice = indice;
      campaign.libro_temi = temi.length > 0 ? temi : [];
      campaign.stato = 'bozza';
    }
    
    closeModal();
    showToast('Dati aggiornati! Rigenerazione target...', 'success');
    
    await generateTargets(campaignId);
  } catch (e) {
    showToast('Errore aggiornamento: ' + e.message, 'error');
  }
}

// --- Mostra / Nascondi form nuova campagna ---
function showNewCampaignForm() {
  document.getElementById('campaign-form-container').classList.remove('hidden');
  document.getElementById('btn-new-campaign').classList.add('hidden');
  document.getElementById('campaign-form').reset();
  document.getElementById('camp-editore').value = 'Zanichelli';
  
  // Nascondi pannelli secondari
  const panel = document.getElementById('scenario-panel');
  if (panel) panel.classList.add('hidden');
  
  const catalogPanel = document.getElementById('catalog-import-panel');
  if (catalogPanel) catalogPanel.classList.add('hidden');
  
  clearCatalogSelection();
  
  // Pre-carica risorse in background (senza aprire il pannello catalogo)
  loadCatalog();
  loadFrameworks();
}

function hideCampaignForm() {
  document.getElementById('campaign-form-container').classList.add('hidden');
  document.getElementById('btn-new-campaign').classList.remove('hidden');
}

// --- Crea nuova campagna ---
async function handleCreateCampaign(event) {
  event.preventDefault();
  
  if (!supabaseClient) {
    showToast('Configura Supabase nelle Impostazioni', 'error');
    return;
  }
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  
  const titolo = document.getElementById('camp-titolo').value.trim();
  const materia = document.getElementById('camp-materia').value.trim();
  
  if (!titolo) {
    showToast('Inserisci il titolo del volume', 'warning');
    return;
  }
  if (!materia) {
    showToast('Inserisci la materia di riferimento', 'warning');
    return;
  }
  
  const temiInput = document.getElementById('camp-temi').value;
  const temi = temiInput ? temiInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  const indice = document.getElementById('camp-indice').value || null;
  
  // Stato sempre 'bozza' al momento della creazione (compatibile con constraint DB).
  // La distinzione pre-valutazione/completa e gestita lato frontend.
  const stato = 'bozza';
  
  const campaign = {
    user_id: session.user.id,
    libro_titolo: titolo,
    libro_autore: document.getElementById('camp-autore').value || null,
    libro_editore: document.getElementById('camp-editore').value || 'Zanichelli',
    libro_materia: materia,
    libro_indice: indice,
    libro_temi: temi,
    stato: stato
  };
  
  try {
    const { data, error } = await supabaseClient.from('campagne').insert(campaign).select().single();
    if (error) throw error;
    
    showToast('Campagna creata! Generazione target in corso...', 'success');
    hideCampaignForm();
    await loadCampaigns();
    
    // Genera SEMPRE i target — l'algoritmo funziona anche solo con la materia
    await generateTargets(data.id);
  } catch (e) {
    showToast('Errore creazione campagna: ' + e.message, 'error');
  }
}

// ===================================================
// GENERAZIONE TARGET (ALGORITMO COMMERCIALE)
// ===================================================

async function generateTargets(campaignId) {
  let campaign = allCampaigns.find(c => c.id === campaignId);
  if (!campaign) {
    await loadCampaigns();
    campaign = allCampaigns.find(c => c.id === campaignId);
    if (!campaign) {
      showToast('Campagna non trovata', 'error');
      return;
    }
  }
  
  // Carica risorse
  await loadCatalog();
  await loadFrameworks();
  
  const materia = campaign.libro_materia;
  const framework = findFrameworkForSubject(materia);
  
  // Carica programmi
  const { data: { session } } = await supabaseClient.auth.getSession();
  const { data: programs, error } = await supabaseClient
    .from('programmi')
    .select('*')
    .eq('user_id', session.user.id);
  
  if (error || !programs || programs.length === 0) {
    showToast('Nessun programma nel database. Carica prima dei PDF dalla sezione Upload.', 'warning');
    return;
  }
  
  // === DETERMINA FASE (Pre-valutazione o Completa) ===
  // REGOLA: la fase e 'completa' SOLO se l'utente ha fornito INDICE o TEMI del volume.
  // I concetti del framework servono per lo scoring, NON per la fase.
  // Senza indice/temi -> Pre-valutazione: matching base + motivazioni template.
  
  let bookThemes = campaign.libro_temi || [];
  const hasIndice = campaign.libro_indice && campaign.libro_indice.trim().length > 20;
  const hasApiKey = !!CONFIG.OPENAI_API_KEY;
  const hadUserThemes = bookThemes.length > 0; // temi inseriti dall'utente
  let fase = 'pre_valutazione'; // default
  
  // Se l'utente ha fornito l'indice ma non i temi, estraili con LLM
  if (bookThemes.length === 0 && hasIndice && hasApiKey) {
    showToast('Generazione temi dal sommario del volume...', 'info');
    try {
      const themeResult = await callOpenAI(
        'Estrai 10-15 temi/argomenti chiave dal seguente indice di un libro accademico. Rispondi con JSON: {"temi": ["tema1", "tema2", ...]}',
        campaign.libro_indice,
        true
      );
      bookThemes = themeResult.temi || [];
      await supabaseClient.from('campagne').update({ libro_temi: bookThemes }).eq('id', campaignId);
      campaign.libro_temi = bookThemes;
    } catch (e) {
      console.error('Errore generazione temi:', e);
      showToast('Errore generazione temi: ' + e.message, 'warning');
    }
  }
  
  // La fase e COMPLETA solo se abbiamo temi reali del volume (da utente o da indice)
  if (bookThemes.length > 0 || hasIndice) {
    fase = 'completa';
  }
  
  // Per lo SCORING (overlap + framework): se non abbiamo temi del libro,
  // usiamo i concetti del framework come riferimento di matching.
  // MA questo NON cambia la fase — resta pre-valutazione.
  let matchingThemes = [...bookThemes]; // temi per il calcolo overlap
  if (matchingThemes.length === 0 && framework) {
    for (const mod of framework.syllabus_modules) {
      for (const kc of (mod.key_concepts || [])) {
        if (typeof kc === 'string' && kc.trim()) {
          matchingThemes.push(kc);
        }
      }
    }
    if (matchingThemes.length > 0) {
      showToast(`Scoring con ${matchingThemes.length} concetti dal framework (non sono temi del libro)`, 'info');
    }
  }
  
  // Log informativo
  if (fase === 'pre_valutazione') {
    showToast('Pre-valutazione: solo materia + scenario. Aggiungi l\'indice per motivazioni personalizzate.', 'info');
    if (framework) {
      showToast(`Framework "${framework.name}" usato per lo scoring (${framework.syllabus_modules.length} moduli)`, 'info');
    }
  } else {
    showToast(`Analisi completa: ${bookThemes.length} temi del volume disponibili`, 'info');
  }
  
  // === MATCHING ===
  showToast(`Calcolo rilevanza su ${programs.length} programmi...`, 'info');
  const targets = [];
  
  for (const prog of programs) {
    // Per il matching usa matchingThemes (possono includere concetti framework)
    // ma la FASE resta determinata solo da dati reali del volume
    const result = calculateRelevance(campaign, prog, matchingThemes, framework);
    if (result) {
      targets.push(result);
    }
  }
  
  if (targets.length === 0) {
    showToast('Nessun programma corrisponde alla materia "' + materia + '". Verifica che i programmi caricati contengano questa materia.', 'warning');
  }
  
  // Ordina: Alta prima, poi Media, poi Bassa
  const relevanceOrder = { 'alta': 0, 'media': 1, 'bassa': 2 };
  const scenarioOrder = { 'zanichelli_assente': 0, 'zanichelli_alternativo': 1, 'zanichelli_principale': 2 };
  
  targets.sort((a, b) => {
    const relDiff = (relevanceOrder[a.rilevanza] || 3) - (relevanceOrder[b.rilevanza] || 3);
    if (relDiff !== 0) return relDiff;
    return (scenarioOrder[a.scenario] || 3) - (scenarioOrder[b.scenario] || 3);
  });
  
  // === GENERA MOTIVAZIONI ===
  document.getElementById('target-results-container').classList.remove('hidden');
  document.getElementById('target-campaign-title').textContent = campaign.libro_titolo;
  
  const highMedTargets = targets.filter(t => t.rilevanza === 'alta' || t.rilevanza === 'media');
  const targetProgress = document.getElementById('target-progress');
  const targetProgressBar = document.getElementById('target-progress-bar');
  const targetProgressText = document.getElementById('target-progress-text');
  
  if (highMedTargets.length > 0 && hasApiKey) {
    // === MOTIVAZIONI LLM — sempre, se c'e API key ===
    // In pre-valutazione: analisi competitiva (programma vs concorrente)
    // In fase completa: analisi + confronto con il nuovo volume
    targetProgress.classList.remove('hidden');
    
    for (let i = 0; i < highMedTargets.length; i++) {
      const t = highMedTargets[i];
      const pct = Math.round(((i + 1) / highMedTargets.length) * 100);
      targetProgressBar.style.width = pct + '%';
      targetProgressText.textContent = `${i + 1}/${highMedTargets.length}`;
      
      try {
        // Dati del volume (se disponibili)
        const bookData = {
          titolo: campaign.libro_titolo,
          autore: campaign.libro_autore,
          materia: campaign.libro_materia,
          temi: bookThemes.slice(0, 15),
          hasIndice: hasIndice,
          fase: fase
        };
        
        // Manuali citati dal docente
        const manualiDocente = t.programData.manuali_citati || [];
        const princ = manualiDocente.find(m => m.ruolo === 'principale');
        const altri = manualiDocente.filter(m => m.ruolo !== 'principale');
        
        // ARRICCHIMENTO: cerca l'indice del concorrente nel catalogo
        let indiceConcorrente = null;
        if (princ && princ.titolo) {
          const concorrenteCatalogo = findManualInCatalog(princ.titolo, princ.autore);
          if (concorrenteCatalogo) {
            indiceConcorrente = concorrenteCatalogo.chapters_summary || null;
          }
        }
        
        // Framework moduli dettagliati
        let frameworkModuliDettaglio = [];
        if (framework && framework.syllabus_modules) {
          frameworkModuliDettaglio = framework.syllabus_modules.map(m => ({
            nome: m.name,
            concetti: (m.key_concepts || []).filter(k => typeof k === 'string').slice(0, 5)
          }));
        }
        
        const targetInfo = {
          docente_nome: t.programData.docente_nome,
          ateneo: t.programData.ateneo,
          materia_inferita: t.programData.materia_inferita,
          temi_principali: t.programData.temi_principali,
          manuale_attuale: princ ? `${princ.titolo || ''} (${princ.autore || ''})` : 'Nessuno citato',
          manuale_editore: princ?.editore || '',
          indice_concorrente: indiceConcorrente,
          manuali_complementari: altri.map(m => m.titolo || '').filter(Boolean).join(', ') || 'Nessuno',
          scenario_zanichelli: t.programData.scenario_zanichelli,
          classe_laurea: t.programData.classe_laurea,
          profilo_classe: t.profiloClasse,
          framework_score: t.frameworkScore,
          temi_comuni_framework: t.temiComuni || [],
          overlap_pct: t.overlapPct || 0,
          framework_moduli_coperti: t.frameworkModuliCoperti || [],
          framework_dettaglio: frameworkModuliDettaglio
        };
        
        t.motivazione = await generateMotivation(bookData, targetInfo);
      } catch (e) {
        console.error('Errore motivazione LLM per', t.programData.docente_nome, e);
        t.motivazione = generateTemplateMotivation(campaign, t);
      }
      
      if (i < highMedTargets.length - 1) {
        await sleep(CONFIG.BATCH_DELAY_MS);
      }
    }
    
    targetProgress.classList.add('hidden');
  } else {
    // === FALLBACK senza API key: Motivazioni template ===
    highMedTargets.forEach(t => {
      t.motivazione = generateTemplateMotivation(campaign, t);
    });
  }
  
  // Motivazione per bassa rilevanza (consolidamento) — usa lo stesso template ricco
  targets.filter(t => t.rilevanza === 'bassa').forEach(t => {
    t.motivazione = generateTemplateMotivation(campaign, t);
  });
  
  // === SALVA ===
  const targetData = targets.map(t => ({
    programma_id: t.programData.id,
    docente_nome: t.programData.docente_nome,
    docente_email: t.programData.docente_email,
    ateneo: t.programData.ateneo,
    materia: t.programData.materia_inferita,
    classe_laurea: t.programData.classe_laurea,
    scenario: t.programData.scenario_zanichelli,
    rilevanza: t.rilevanza,
    overlap_pct: t.overlapPct,
    framework_score: t.frameworkScore,
    manuale_principale: t.manualePrincipale,
    motivazione: t.motivazione,
    temi_comuni: t.temiComuni
  }));
  
  // Stato finale nel DB: 'completata' se fase completa con temi reali, 'bozza' se pre-valutazione
  // (il DB accetta solo 'bozza' e 'completata')
  const statoFinale = (fase === 'completa' && bookThemes.length > 0) ? 'completata' : 'bozza';
  
  try {
    await supabaseClient.from('campagne').update({
      target_generati: targetData,
      stato: statoFinale,
      updated_at: new Date().toISOString()
    }).eq('id', campaignId);
  } catch (e) {
    console.error('Errore salvataggio target:', e);
  }
  
  // Aggiorna in memoria
  campaign.stato = statoFinale;
  campaign.target_generati = targetData;
  
  currentTargets = targetData;
  currentCampaignId = campaignId;
  renderTargets(targetData);
  loadCampaigns();
  
  const faseLabel = fase === 'completa' ? 'Analisi completa' : 'Pre-valutazione';
  showToast(`${faseLabel}: ${targets.length} target trovati!`, 'success');
}

// === MOTIVAZIONI TEMPLATE — PRE-VALUTAZIONE ===
// Il volume NON esiste ancora. Non promuoviamo niente.
// Queste note servono come INTELLIGENCE DI MERCATO:
//   - Cosa usa oggi il docente?
//   - Come e strutturato il suo programma?
//   - Cosa dovrebbe avere il nuovo volume per essere competitivo QUI?
// Quando il volume sara disponibile (fase Completa), le motivazioni
// diventeranno note promozionali con confronto diretto.

function generateTemplateMotivation(campaign, target) {
  const scenario = target.scenario || target.programData?.scenario_zanichelli || '';
  const docente = target.programData?.docente_nome || 'Il docente';
  const ateneo = target.programData?.ateneo || '';
  const materia = campaign.libro_materia || '';
  
  // --- DATI dal matching ---
  const manuali = target.programData?.manuali_citati || [];
  const manualePrinc = manuali.find(m => m.ruolo === 'principale');
  const manualiAltri = manuali.filter(m => m.ruolo !== 'principale');
  const temiDocente = (target.programData?.temi_principali || []).filter(t => typeof t === 'string' && t.trim());
  const temiComuni = (target.temiComuni || []).filter(t => typeof t === 'string' && t.trim());
  const fwScore = target.frameworkScore || 0;
  const fwModuli = target.frameworkModuliCoperti || [];
  
  // Nome concorrente pulito
  const concorrenteTitolo = manualePrinc?.titolo || null;
  const concorrenteAutore = manualePrinc?.autore || null;
  const concorrenteEditore = manualePrinc?.editore || null;
  let concorrenteLabel = null;
  if (concorrenteTitolo) {
    concorrenteLabel = concorrenteTitolo;
    if (concorrenteAutore) concorrenteLabel += ` (${concorrenteAutore})`;
    if (concorrenteEditore && concorrenteEditore.toLowerCase() !== 'zanichelli') {
      concorrenteLabel += `, ${concorrenteEditore}`;
    }
  }
  
  // Temi chiave del programma (leggibili)
  const temiRilevanti = temiComuni.length > 0 ? temiComuni : temiDocente;
  const temiStr = temiRilevanti.slice(0, 4).join(', ');
  
  // --- COSTRUZIONE NOTA DI INTELLIGENCE ---
  const righe = [];
  
  // === SITUAZIONE: cosa usa oggi ===
  if (scenario === 'zanichelli_assente') {
    if (concorrenteLabel) {
      righe.push(`ADOZIONE ATTUALE: ${concorrenteLabel}.`);
      // Aggiungi complementari se ci sono
      if (manualiAltri.length > 0) {
        const altri = manualiAltri.map(m => m.titolo).filter(Boolean).slice(0, 2).join(', ');
        if (altri) righe[righe.length - 1] = `ADOZIONE ATTUALE: ${concorrenteLabel}. Integra con: ${altri}.`;
      }
    } else if (manuali.length > 0) {
      const nomi = manuali.map(m => m.titolo).filter(Boolean).slice(0, 2).join(', ');
      righe.push(`ADOZIONE ATTUALE: Nessun testo principale identificato. Citati: ${nomi}.`);
    } else {
      righe.push(`ADOZIONE ATTUALE: Nessun manuale specifico nel programma.`);
    }
  } else if (scenario === 'zanichelli_alternativo') {
    if (concorrenteLabel) {
      righe.push(`ADOZIONE ATTUALE: ${concorrenteLabel} come principale. Zanichelli gia tra gli alternativi.`);
    } else {
      righe.push(`ADOZIONE ATTUALE: Zanichelli presente come testo alternativo.`);
    }
  } else {
    // zanichelli_principale
    if (concorrenteLabel) {
      righe.push(`ADOZIONE ATTUALE: ${concorrenteLabel} (Zanichelli, testo principale). Docente fidelizzato.`);
    } else {
      righe.push(`ADOZIONE ATTUALE: Zanichelli come testo principale.`);
    }
  }
  
  // === PROGRAMMA: struttura del corso ===
  if (temiStr) {
    righe.push(`PROGRAMMA: ${temiStr}.`);
  }
  if (fwScore > 0 && fwModuli.length > 0) {
    const aree = fwModuli.slice(0, 3).join(', ');
    righe.push(`Aree disciplinari coperte: ${aree}.`);
  }
  
  // === REQUISITI: cosa deve avere il nuovo volume per essere competitivo ===
  if (scenario === 'zanichelli_assente') {
    if (concorrenteTitolo && temiStr) {
      righe.push(`PER COMPETERE: Il nuovo volume deve coprire ${temiStr} e offrire vantaggi concreti rispetto a ${concorrenteTitolo} (struttura, aggiornamento, digitale, prezzo).`);
    } else if (concorrenteTitolo) {
      righe.push(`PER COMPETERE: Analizzare i punti di forza e debolezza di ${concorrenteTitolo} per posizionare il nuovo volume come alternativa credibile.`);
    } else if (temiStr) {
      righe.push(`PER COMPETERE: Il nuovo volume deve coprire almeno: ${temiStr}. Terreno libero, nessun concorrente dominante.`);
    } else {
      righe.push(`PER COMPETERE: Terreno libero. Verificare i contenuti del programma per calibrare l'offerta.`);
    }
  } else if (scenario === 'zanichelli_alternativo') {
    if (temiStr) {
      righe.push(`PER COMPETERE: Zanichelli e gia nel programma. Il nuovo volume deve coprire ${temiStr} meglio del testo principale per guadagnare la prima posizione.`);
    } else {
      righe.push(`PER COMPETERE: Zanichelli e gia nel programma. Capire perche non e primo: completezza? aggiornamento? materiali digitali?`);
    }
  } else {
    // zanichelli_principale — consolidamento
    righe.push(`PER IL RINNOVO: Docente gia Zanichelli. Verificare se il testo attuale e aggiornato. Eventuale affiancamento o sostituzione con edizione piu recente.`);
  }
  
  return righe.join(' ');
}

// === LOOKUP CONCORRENTE NEL CATALOGO ===
// Cerca un manuale nel catalogo MATRIX per recuperare l'indice completo.
// Matching flessibile: confronta titolo e autore con tolleranza.
function findManualInCatalog(titoloCercato, autoreCercato) {
  if (!catalogManuals || !catalogManuals.length || !titoloCercato) return null;
  
  const titNorm = titoloCercato.toLowerCase().trim();
  const autNorm = (autoreCercato || '').toLowerCase().trim();
  
  // 1. Match esatto sul titolo
  let found = catalogManuals.find(m => 
    m.title && m.title.toLowerCase().trim() === titNorm
  );
  if (found) return found;
  
  // 2. Match parziale: il titolo del catalogo contiene il cercato o viceversa
  found = catalogManuals.find(m => {
    if (!m.title) return false;
    const catTit = m.title.toLowerCase().trim();
    return catTit.includes(titNorm) || titNorm.includes(catTit);
  });
  if (found) return found;
  
  // 3. Match su autore + prima parola significativa del titolo
  if (autNorm) {
    const primaParola = titNorm.split(/\s+/).find(w => w.length > 3) || titNorm.split(/\s+/)[0];
    found = catalogManuals.find(m => {
      if (!m.author || !m.title) return false;
      const catAut = m.author.toLowerCase();
      const catTit = m.title.toLowerCase();
      return catAut.includes(autNorm.split(',')[0].split(' ')[0]) && catTit.includes(primaParola);
    });
    if (found) return found;
  }
  
  // 4. Levenshtein su titolo (soglia alta)
  let bestMatch = null;
  let bestScore = 0;
  for (const m of catalogManuals) {
    if (!m.title) continue;
    const sim = levenshteinSimilarity(titNorm, m.title.toLowerCase().trim());
    if (sim > 0.7 && sim > bestScore) {
      bestScore = sim;
      bestMatch = m;
    }
  }
  
  return bestMatch;
}

// ===================================================
// ALGORITMO DI MATCHING — Logica Commerciale
// ===================================================
//
// PRINCIPIO: Una campagna promuove un volume specifico di una materia.
// La domanda non e "quanti temi in comune?" ma:
//   1. Il docente insegna la materia giusta?
//   2. Quanto e "conquistabile" (scenario Zanichelli)?
//   3. Quali manuali usa attualmente? (concorrente diretto?)
//   4. Il framework disciplinare conferma l'affinita?
//
// CLASSIFICAZIONE:
//   ALTA   = materia OK + zanichelli_assente
//   MEDIA  = materia OK + zanichelli_alternativo
//   BASSA  = materia OK + zanichelli_principale (consolidamento)
//   ESCLUSO = materia non coincidente
//
// AGGIUSTAMENTO: overlap tematico o framework score possono alzare di livello

function calculateRelevance(campaign, program, bookThemes, framework) {
  // STEP 1: Filtro Materia
  const subjectMatch = checkSubjectMatch(campaign.libro_materia, program.materia_inferita);
  if (!subjectMatch) return null;
  
  // STEP 2: Scenario Zanichelli → Priorita base
  const scenario = program.scenario_zanichelli || 'zanichelli_assente';
  let basePriority;
  switch (scenario) {
    case 'zanichelli_assente': basePriority = 'alta'; break;
    case 'zanichelli_alternativo': basePriority = 'media'; break;
    case 'zanichelli_principale': basePriority = 'bassa'; break;
    default: basePriority = 'media';
  }
  
  // STEP 3: Manuali citati
  const manuali = program.manuali_citati || [];
  const manualePrincipale = manuali.find(m => m.ruolo === 'principale');
  
  // Se usa un concorrente diretto e Zanichelli e assente → conferma alta
  const usaConcorrenteDiretto = manualePrincipale &&
    !isZanichelliAuthor(manualePrincipale.autore);
  
  if (usaConcorrenteDiretto && scenario === 'zanichelli_assente') {
    basePriority = 'alta';
  }
  
  // STEP 4: Overlap tematico
  const progThemes = (program.temi_principali || []).filter(t => typeof t === 'string' && t.trim()).map(t => t.toLowerCase());
  const bkThemes = (bookThemes || []).filter(t => typeof t === 'string' && t.trim()).map(t => t.toLowerCase());
  
  let matchCount = 0;
  const temiComuni = [];
  
  for (const bt of bkThemes) {
    for (const pt of progThemes) {
      if (bt === pt || bt.includes(pt) || pt.includes(bt) || levenshteinSimilarity(bt, pt) > 0.65) {
        matchCount++;
        temiComuni.push(pt);
        break;
      }
    }
  }
  
  const overlapPct = bkThemes.length > 0 ? matchCount / bkThemes.length : 0;
  
  // STEP 5: Framework matching
  let frameworkScore = 0;
  let frameworkModuliCoperti = [];
  
  if (framework && framework.syllabus_modules) {
    const fwConcepts = [];
    for (const mod of framework.syllabus_modules) {
      for (const kc of (mod.key_concepts || [])) {
        if (typeof kc !== 'string' || !kc.trim()) continue;
        fwConcepts.push({ concept: kc.toLowerCase(), module: mod.name });
      }
    }
    
    const moduliSet = new Set();
    for (const pt of progThemes) {
      for (const fc of fwConcepts) {
        if (pt.includes(fc.concept) || fc.concept.includes(pt) || levenshteinSimilarity(pt, fc.concept) > 0.65) {
          moduliSet.add(fc.module);
        }
      }
    }
    
    frameworkModuliCoperti = [...moduliSet];
    frameworkScore = framework.syllabus_modules.length > 0
      ? moduliSet.size / framework.syllabus_modules.length : 0;
  }
  
  // STEP 6: Aggiustamento — overlap alto o FW score alto → alza di livello
  let rilevanza = basePriority;
  if (overlapPct >= 0.4 || frameworkScore >= 0.3) {
    if (rilevanza === 'bassa') rilevanza = 'media';
    else if (rilevanza === 'media') rilevanza = 'alta';
  }
  
  // STEP 7: Profilo Classe di Laurea
  let profiloClasse = null;
  if (framework && framework.program_profiles && program.classe_laurea) {
    const classeLaurea = program.classe_laurea.toUpperCase();
    profiloClasse = framework.program_profiles.find(p =>
      p.name.toUpperCase().includes(classeLaurea)
    );
  }
  
  return {
    programData: program,
    rilevanza,
    overlapPct: Math.round(overlapPct * 100),
    frameworkScore: Math.round(frameworkScore * 100),
    frameworkModuliCoperti,
    temiComuni: [...new Set(temiComuni)],
    scenario,
    manualePrincipale: manualePrincipale
      ? `${manualePrincipale.titolo || ''} (${manualePrincipale.autore || ''})`
      : null,
    profiloClasse: profiloClasse?.priority_modules || null,
    motivazione: ''
  };
}

// --- Check Subject Match (flessibile) ---
function checkSubjectMatch(materia1, materia2) {
  if (!materia1 || !materia2) return false;
  const m1 = materia1.toLowerCase().trim();
  const m2 = materia2.toLowerCase().trim();
  
  if (m1 === m2) return true;
  if (m1.includes(m2) || m2.includes(m1)) return true;
  if (levenshteinSimilarity(m1, m2) > 0.75) return true;
  
  const synonyms = [
    ['chimica generale', 'chimica generale e inorganica', 'chimica di base'],
    ['chimica organica', 'chimica organica e bioorganica'],
    ['fisica', 'fisica generale', 'fisica 1', 'fisica 2'],
    ['economia', 'economia politica', 'economia di base'],
    ['istologia', 'istologia e embriologia'],
    ['biologia', 'biologia cellulare', 'biologia generale'],
    ['psicologia', 'psicologia generale'],
  ];
  
  for (const group of synonyms) {
    const m1Match = group.some(s => m1.includes(s) || s.includes(m1));
    const m2Match = group.some(s => m2.includes(s) || s.includes(m2));
    if (m1Match && m2Match) return true;
  }
  
  return false;
}

function isZanichelliAuthor(authorStr) {
  if (!authorStr) return false;
  const lower = authorStr.toLowerCase();
  return CONFIG.ZANICHELLI_AUTHORS.some(a => lower.includes(a));
}

// --- Levenshtein Similarity ---
function levenshteinSimilarity(a, b) {
  if (a.length === 0) return 0;
  if (b.length === 0) return 0;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
}

// ===================================================
// VISUALIZZAZIONE TARGET
// ===================================================

function viewTargets(campaignId) {
  const campaign = allCampaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  currentTargets = campaign.target_generati || [];
  currentCampaignId = campaignId;
  
  document.getElementById('target-results-container').classList.remove('hidden');
  document.getElementById('target-campaign-title').textContent = campaign.libro_titolo;
  
  renderTargets(currentTargets);
}

function renderTargets(targets) {
  const tbody = document.getElementById('target-table-body');
  const alta = targets.filter(t => t.rilevanza === 'alta').length;
  const media = targets.filter(t => t.rilevanza === 'media').length;
  const bassa = targets.filter(t => t.rilevanza === 'bassa').length;
  
  document.getElementById('target-alta').textContent = `Alta: ${alta}`;
  document.getElementById('target-media').textContent = `Media: ${media}`;
  document.getElementById('target-bassa').textContent = `Bassa: ${bassa}`;
  
  if (targets.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">
        Nessun target trovato — nessun programma corrisponde alla materia della campagna
      </td></tr>`;
    return;
  }
  
  tbody.innerHTML = targets.map((t, i) => {
    const rowBg = t.rilevanza === 'alta' ? 'bg-green-50/50' : t.rilevanza === 'media' ? 'bg-yellow-50/30' : '';
    const manualeStr = t.manuale_principale
      ? `<div class="text-xs text-gray-400 mt-1" title="${t.manuale_principale}"><i class="fas fa-book text-[10px] mr-1"></i>${truncate(t.manuale_principale, 30)}</div>` : '';
    const fwBadge = t.framework_score > 0
      ? `<div class="text-xs text-blue-500 mt-1" title="Copertura framework disciplinare"><i class="fas fa-chart-bar text-[10px] mr-1"></i>FW ${t.framework_score}%</div>` : '';
    
    return `
      <tr class="border-t ${rowBg}">
        <td class="px-4 py-3 text-gray-500 text-xs">${i + 1}</td>
        <td class="px-4 py-3">
          <div class="font-medium text-gray-800">${t.docente_nome || '—'}</div>
          ${t.docente_email ? `<div class="text-xs text-gray-400">${t.docente_email}</div>` : ''}
          ${manualeStr}
        </td>
        <td class="px-4 py-3 text-gray-600 text-sm">
          ${t.ateneo || '—'}
          ${t.classe_laurea ? `<div class="text-xs text-gray-400">${t.classe_laurea}</div>` : ''}
        </td>
        <td class="px-4 py-3 text-gray-600 text-sm">${t.materia || '—'}</td>
        <td class="px-4 py-3">${scenarioBadge(t.scenario)}</td>
        <td class="px-4 py-3">
          ${relevanceBadge(t.rilevanza)}
          <div class="text-xs text-gray-400 mt-1" title="Overlap tematico: quanto i temi del programma corrispondono ai contenuti di riferimento"><i class="fas fa-chart-pie text-[10px] mr-1"></i>${t.overlap_pct || 0}% overlap</div>
          ${fwBadge}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 max-w-md">${formatMotivazione(t.motivazione, i)}</td>
      </tr>`;
  }).join('');
}

// --- Formatta motivazione con sezioni collapsibili ---
function formatMotivazione(testo, rowIndex) {
  if (!testo || testo === '—') return '—';
  
  // Sezioni note (LLM fase completa, pre-valutazione, template)
  const sectionDefs = [
    { label: 'SITUAZIONE', icon: 'fa-crosshairs', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'LEVE', icon: 'fa-bullseye', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'COLLOQUIO', icon: 'fa-comments', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'MANUALE ATTUALE', icon: 'fa-book', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'GAP E PUNTI DEBOLI', icon: 'fa-exclamation-triangle', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'LEVE PER IL CAMBIO', icon: 'fa-bullseye', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'ADOZIONE ATTUALE', icon: 'fa-book', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'PROGRAMMA', icon: 'fa-list', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'PER COMPETERE', icon: 'fa-bullseye', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'PER IL RINNOVO', icon: 'fa-sync-alt', color: 'text-blue-600', bg: 'bg-blue-50' },
  ];
  
  // Cerca le sezioni nel testo (con ** o senza)
  const sections = [];
  let remainingText = testo;
  
  // Normalizza: rimuovi ** markdown
  remainingText = remainingText.replace(/\*\*/g, '');
  
  // Trova tutte le sezioni
  const sortedDefs = [...sectionDefs].sort((a, b) => b.label.length - a.label.length);
  const sectionPositions = [];
  
  for (const def of sortedDefs) {
    // Match: "LABEL:" o "LABEL :" 
    const regex = new RegExp(`(${def.label}\\s*:\\s*)`, 'gi');
    let match;
    while ((match = regex.exec(remainingText)) !== null) {
      sectionPositions.push({
        index: match.index,
        matchLength: match[1].length,
        def: def
      });
    }
  }
  
  if (sectionPositions.length < 2) {
    // Nessuna struttura riconosciuta — mostra testo semplice troncato
    const preview = remainingText.slice(0, 120);
    const hasMore = remainingText.length > 120;
    if (!hasMore) return `<p class="text-gray-600 text-xs leading-relaxed">${remainingText}</p>`;
    return `
      <div>
        <p class="text-gray-600 text-xs leading-relaxed">${preview}...</p>
        <button onclick="this.parentElement.querySelector('.mot-full').classList.toggle('hidden');this.classList.toggle('hidden')" 
                class="text-xs text-zanichelli-light hover:underline mt-1">
          <i class="fas fa-chevron-down mr-1"></i>Leggi tutto
        </button>
        <div class="mot-full hidden mt-2">
          <p class="text-gray-600 text-xs leading-relaxed">${remainingText}</p>
        </div>
      </div>`;
  }
  
  // Ordina per posizione
  sectionPositions.sort((a, b) => a.index - b.index);
  
  // Estrai contenuto di ogni sezione
  for (let s = 0; s < sectionPositions.length; s++) {
    const pos = sectionPositions[s];
    const contentStart = pos.index + pos.matchLength;
    const contentEnd = s < sectionPositions.length - 1 ? sectionPositions[s + 1].index : remainingText.length;
    const content = remainingText.slice(contentStart, contentEnd).trim();
    
    if (content) {
      sections.push({ ...pos.def, content });
    }
  }
  
  if (sections.length === 0) {
    return `<p class="text-gray-600 text-xs leading-relaxed">${remainingText.slice(0, 150)}...</p>`;
  }
  
  // Render: prima sezione aperta, altre chiuse
  return sections.map((sec, si) => {
    const uid = `mot-${rowIndex}-${si}`;
    const isFirst = si === 0;
    return `
      <div class="mb-1.5">
        <button onclick="document.getElementById('${uid}').classList.toggle('hidden');this.querySelector('.chev').classList.toggle('fa-chevron-right');this.querySelector('.chev').classList.toggle('fa-chevron-down')" 
                class="flex items-center gap-1.5 w-full text-left group">
          <i class="fas fa-chevron-${isFirst ? 'down' : 'right'} chev text-[9px] text-gray-400 w-3 transition-transform"></i>
          <i class="fas ${sec.icon} ${sec.color} text-[10px]"></i>
          <span class="text-xs font-semibold ${sec.color} uppercase tracking-wide">${sec.label}</span>
        </button>
        <div id="${uid}" class="${isFirst ? '' : 'hidden'} mt-1 ml-5 pl-2 border-l-2 ${sec.bg} rounded-r">
          <p class="text-xs text-gray-600 leading-relaxed py-1.5 px-2">${sec.content}</p>
        </div>
      </div>`;
  }).join('');
}

// --- Export CSV ---
function exportTargetCSV() {
  if (!currentTargets || currentTargets.length === 0) {
    showToast('Nessun target da esportare', 'warning');
    return;
  }
  
  const campaign = allCampaigns.find(c => c.id === currentCampaignId);
  const headers = ['#', 'Docente', 'Email', 'Ateneo', 'Classe', 'Materia', 'Scenario', 'Rilevanza', 'Overlap %', 'FW Score %', 'Manuale Attuale', 'Motivazione'];
  const rows = currentTargets.map((t, i) => [
    i + 1,
    `"${(t.docente_nome || '').replace(/"/g, '""')}"`,
    `"${(t.docente_email || '').replace(/"/g, '""')}"`,
    `"${(t.ateneo || '').replace(/"/g, '""')}"`,
    `"${(t.classe_laurea || '').replace(/"/g, '""')}"`,
    `"${(t.materia || '').replace(/"/g, '""')}"`,
    t.scenario || '',
    t.rilevanza || '',
    t.overlap_pct || 0,
    t.framework_score || 0,
    `"${(t.manuale_principale || '').replace(/"/g, '""')}"`,
    `"${(t.motivazione || '').replace(/"/g, '""')}"`
  ]);
  
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const materia = campaign?.libro_materia || 'campagna';
  const filename = `target_${(campaign?.libro_titolo || materia).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csv, filename);
  showToast('CSV esportato!', 'success');
}

// --- Elimina campagna ---
async function deleteCampaign(id) {
  if (!confirm('Eliminare questa campagna e tutti i target generati?')) return;
  
  try {
    const { error } = await supabaseClient.from('campagne').delete().eq('id', id);
    if (error) throw error;
    
    showToast('Campagna eliminata', 'success');
    document.getElementById('target-results-container').classList.add('hidden');
    loadCampaigns();
  } catch (e) {
    showToast('Errore eliminazione: ' + e.message, 'error');
  }
}

// ===================================================
// IMPOSTAZIONI
// ===================================================

function loadSettings() {
  const apikey = CONFIG.OPENAI_API_KEY;
  const model = CONFIG.LLM_MODEL;
  const supaUrl = localStorage.getItem('matrix_supabase_url') || '';
  const supaKey = localStorage.getItem('matrix_supabase_key') || '';
  
  document.getElementById('settings-apikey').value = apikey;
  document.getElementById('settings-model').value = model;
  document.getElementById('settings-supabase-url').value = supaUrl;
  document.getElementById('settings-supabase-key').value = supaKey;
  
  const status = document.getElementById('apikey-status');
  if (apikey) {
    status.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i><span class="text-green-600">API Key configurata</span>';
  } else {
    status.innerHTML = '<i class="fas fa-exclamation-circle text-yellow-500 mr-1"></i><span class="text-yellow-600">Nessuna API Key configurata</span>';
  }
  
  const supaStatus = document.getElementById('supabase-status');
  if (supaUrl && supaKey) {
    supaStatus.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i><span class="text-green-600">Supabase configurato</span>';
  } else {
    supaStatus.innerHTML = '<i class="fas fa-exclamation-circle text-yellow-500 mr-1"></i><span class="text-yellow-600">Supabase non configurato</span>';
  }
}

function saveApiKey() {
  const key = document.getElementById('settings-apikey').value.trim();
  if (key && !key.startsWith('sk-')) {
    showToast('La API Key OpenAI deve iniziare con "sk-"', 'warning');
    return;
  }
  localStorage.setItem('matrix_openai_key', key);
  showToast(key ? 'API Key salvata!' : 'API Key rimossa', key ? 'success' : 'info');
  loadSettings();
}

function saveModel() {
  const model = document.getElementById('settings-model').value;
  localStorage.setItem('matrix_llm_model', model);
  showToast(`Modello impostato: ${model}`, 'success');
}

function saveSupabaseConfig() {
  const url = document.getElementById('settings-supabase-url').value.trim();
  const key = document.getElementById('settings-supabase-key').value.trim();
  if (!url || !key) {
    showToast('Inserisci sia URL che Anon Key', 'warning');
    return;
  }
  localStorage.setItem('matrix_supabase_url', url);
  localStorage.setItem('matrix_supabase_key', key);
  if (initSupabase()) {
    showToast('Supabase configurato con successo!', 'success');
    loadSettings();
  } else {
    showToast('Errore nella configurazione Supabase', 'error');
  }
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('settings-apikey');
  const icon = document.getElementById('apikey-eye-icon');
  if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { input.type = 'password'; icon.className = 'fas fa-eye'; }
}
