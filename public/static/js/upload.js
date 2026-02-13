// ==========================================
// MATRIX Intelligence — Upload & Pre-classificazione
// ==========================================

let fileQueue = [];
let processingResults = { success: 0, errors: 0, skipped: 0, details: [] };

// --- Sistema Progress Bar Reattivo ---
// Stato globale separato dal loop di processing
const progressState = {
  current: 0,
  total: 0,
  phase: '',
  fileName: '',
  active: false,
  _animFrameId: null
};

// Renderer continuo che gira indipendentemente dal processing
function startProgressRenderer() {
  progressState.active = true;
  
  function renderFrame() {
    if (!progressState.active) return;
    
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    const detail = document.getElementById('progress-detail');
    const title = document.getElementById('progress-title');
    
    const total = progressState.total;
    const current = progressState.current;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = `${current}/${total}`;
    if (detail) detail.textContent = `${progressState.phase} ${progressState.fileName}`;
    if (title && current > 0 && current < total) {
      title.textContent = `Analisi in corso... (${pct}%)`;
    }
    
    progressState._animFrameId = requestAnimationFrame(renderFrame);
  }
  
  renderFrame();
}

function stopProgressRenderer() {
  progressState.active = false;
  if (progressState._animFrameId) {
    cancelAnimationFrame(progressState._animFrameId);
    progressState._animFrameId = null;
  }
}

function setProgress(current, total, phase, fileName) {
  progressState.current = current;
  progressState.total = total;
  progressState.phase = phase;
  progressState.fileName = fileName;
}

// Utility: pausa asincrona
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Configura PDF.js worker ---
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// --- Drag & Drop ---
function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('border-zanichelli-light', 'bg-zanichelli-accent/30');
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove('border-zanichelli-light', 'bg-zanichelli-accent/30');
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('border-zanichelli-light', 'bg-zanichelli-accent/30');
  const files = Array.from(event.dataTransfer.files).filter(f => f.type === 'application/pdf');
  if (files.length === 0) {
    showToast('Seleziona solo file PDF', 'warning');
    return;
  }
  addFilesToQueue(files);
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  addFilesToQueue(files);
  event.target.value = ''; // Reset per permettere ri-selezione
}

function addFilesToQueue(files) {
  files.forEach(f => {
    if (!fileQueue.find(q => q.name === f.name && q.size === f.size)) {
      fileQueue.push(f);
    }
  });
  renderFileQueue();
}

function clearQueue() {
  fileQueue = [];
  renderFileQueue();
  document.getElementById('text-preview-container').classList.add('hidden');
}

function removeFromQueue(index) {
  fileQueue.splice(index, 1);
  renderFileQueue();
}

function renderFileQueue() {
  const container = document.getElementById('file-queue');
  const list = document.getElementById('file-list');
  const count = document.getElementById('queue-count');

  if (fileQueue.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  count.textContent = `${fileQueue.length} file`;
  
  list.innerHTML = fileQueue.map((f, i) => `
    <div class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
      <div class="flex items-center gap-3">
        <i class="fas fa-file-pdf text-red-400"></i>
        <span class="text-sm text-gray-700">${f.name}</span>
        <span class="text-xs text-gray-400">${(f.size / 1024).toFixed(0)} KB</span>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="previewPDF(${i})" class="text-xs text-zanichelli-light hover:text-zanichelli-blue" title="Anteprima testo">
          <i class="fas fa-eye"></i>
        </button>
        <button onclick="removeFromQueue(${i})" class="text-xs text-red-400 hover:text-red-600" title="Rimuovi">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// --- Anteprima testo PDF ---
async function previewPDF(index) {
  const file = fileQueue[index];
  const previewContainer = document.getElementById('text-preview-container');
  const previewEl = document.getElementById('text-preview');

  previewContainer.classList.remove('hidden');
  previewEl.textContent = 'Estrazione testo in corso...';

  try {
    const text = await extractTextFromPDF(file);
    previewEl.textContent = text.substring(0, 3000) + (text.length > 3000 ? '\n\n[...testo troncato per anteprima...]' : '');
  } catch (e) {
    previewEl.textContent = `Errore estrazione: ${e.message}`;
  }
}

// --- Validazione post-LLM dello scenario Zanichelli ---
// Verifica che lo scenario dichiarato dal LLM corrisponda ai manuali citati
// Controlla: editore esplicito "Zanichelli" + match con catalogo sincronizzato da Matrix
function validateZanichelliScenario(classification) {
  const manuali = classification.manuali_citati || [];
  if (manuali.length === 0) return 'zanichelli_assente';
  
  // Legge i Zanichelli dal catalogo sincronizzato (non più da config statico)
  const catalog = getZanichelliFromCatalog();
  console.log(`[Validazione] Catalogo Zanichelli: ${catalog.length} titoli da Matrix`);
  
  // Per ogni manuale citato, verifica se è Zanichelli
  const manualiConFlag = manuali.map(m => {
    const editore = (m.editore || '').toLowerCase().trim();
    const autore = (m.autore || '').toLowerCase().trim();
    const titolo = (m.titolo || '').toLowerCase().trim();
    
    // 1. Editore esplicito "Zanichelli" o marchi del gruppo
    if (editore.includes('zanichelli') || editore === 'cea' || editore.includes('ambrosiana')) {
      return { ...m, _isZanichelli: true, _reason: 'editore gruppo Zanichelli' };
    }
    
    // 2. Editore esplicitamente NON Zanichelli → sicuramente non è Zanichelli
    const altriEditori = ['pearson', 'edises', 'edi-ses', 'mcgraw', 'utet', 'piccin', 
                          'elsevier', 'springer', 'edra', 'wiley', 'adelphi',
                          'hoepli', 'mondadori', 'il mulino', 'egea', 'giappichelli',
                          'giuffrè', 'cacucci', 'laterza', 'carocci', 'franco angeli',
                          'cortina', 'minerva', 'società editrice', 'esculapio', 'patron',
                          'bononia', 'clueb', 'aracne', 'ledizioni', 'vita e pensiero',
                          'edi-ermes', 'edi ermes', 'ediermes', 'idelson', 'gnocchi'];
    if (altriEditori.some(e => editore.includes(e))) {
      return { ...m, _isZanichelli: false, _reason: 'editore concorrente' };
    }
    
    // 3. Editore non specificato → confronta con catalogo Zanichelli
    if (!editore || editore === 'non specificato' || editore === 'n/a' || editore === 'null') {
      const match = catalog.some(c => {
        const cAutore = c.author.toLowerCase();
        const cTitolo = c.title.toLowerCase();
        // Match autore (almeno il cognome principale)
        const autoreParts = cAutore.split(/[,\s]+/).filter(p => p.length > 2);
        const autoreMatch = autoreParts.some(p => autore.includes(p));
        // Match titolo (parole significative)
        const titoloMatch = cTitolo.split(/\s+/).filter(w => w.length > 3).some(w => titolo.includes(w));
        return autoreMatch && titoloMatch;
      });
      return { ...m, _isZanichelli: match, _reason: match ? 'match catalogo (editore mancante)' : 'no match catalogo' };
    }
    
    // 4. Editore presente ma non riconosciuto → non classificare come Zanichelli
    return { ...m, _isZanichelli: false, _reason: 'editore sconosciuto, non Zanichelli' };
  });
  
  // Log solo riepilogo (non ogni singolo manuale)
  const zanFound = manualiConFlag.filter(m => m._isZanichelli);
  if (zanFound.length > 0) {
    console.log(`[Validazione] Zanichelli trovati: ${zanFound.map(m => `"${m.titolo}" (${m._reason})`).join(', ')}`);
  }
  
  // Determina scenario
  const principale = manualiConFlag.find(m => m.ruolo === 'principale');
  const hasZanPrincipale = principale && principale._isZanichelli;
  const hasZanAlternativo = manualiConFlag.some(m => m.ruolo === 'alternativo' && m._isZanichelli);
  
  if (hasZanPrincipale) return 'zanichelli_principale';
  if (hasZanAlternativo) return 'zanichelli_alternativo';
  return 'zanichelli_assente';
}

// --- Sanitizza testo estratto da PDF ---
// Rimuove caratteri di controllo, null bytes e sequenze Unicode problematiche
// che causano errori in JSON.parse() e PostgreSQL/Supabase
function sanitizeExtractedText(text) {
  if (!text) return '';
  
  return text
    // Rimuove null bytes (\x00) - non accettati da PostgreSQL
    .replace(/\x00/g, '')
    // Rimuove caratteri di controllo C0 (U+0000-U+001F) eccetto tab, newline, carriage return
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Rimuove caratteri di controllo C1 (U+0080-U+009F)
    .replace(/[\x80-\x9F]/g, '')
    // Rimuove caratteri Unicode sostitutivi (surrogates isolati)
    .replace(/[\uD800-\uDFFF]/g, '')
    // Rimuove BOM (Byte Order Mark)
    .replace(/\uFEFF/g, '')
    // Rimuove caratteri Unicode speciali problematici
    .replace(/[\uFFF0-\uFFFF]/g, '')
    // Normalizza whitespace multipli in singoli spazi
    .replace(/[ \t]+/g, ' ')
    // Normalizza newline multiple (max 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Estrai testo da PDF ---
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  // Sanitizza il testo per rimuovere caratteri problematici
  return sanitizeExtractedText(fullText);
}

// --- Avvia elaborazione batch ---
async function startProcessing() {
  if (fileQueue.length === 0) {
    showToast('Nessun file in coda', 'warning');
    return;
  }

  if (!CONFIG.OPENAI_API_KEY) {
    showToast('Configura la API Key OpenAI nelle Impostazioni', 'error');
    navigateTo('impostazioni');
    return;
  }

  if (!supabaseClient) {
    showToast('Configura Supabase nelle Impostazioni', 'error');
    navigateTo('impostazioni');
    return;
  }

  // Verifica sessione
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('Sessione scaduta. Effettua nuovamente il login.', 'error');
    window.location.href = '/login';
    return;
  }

  // Carica il catalogo manuali (necessario per la validazione Zanichelli)
  // Il catalogo potrebbe non essere stato caricato se l'utente è andato direttamente su Upload
  await loadCatalog();
  const zanCount = getZanichelliFromCatalog().length;
  console.log(`[Upload] Catalogo caricato: ${catalogManuals.length} manuali totali, ${zanCount} Zanichelli`);

  processingResults = { success: 0, errors: 0, skipped: 0, details: [] };
  
  // Salva copie locali per evitare problemi di garbage collection
  const filesToProcess = [...fileQueue];
  const total = filesToProcess.length;

  // Setup UI
  document.getElementById('btn-start-processing').disabled = true;
  document.getElementById('processing-progress').classList.remove('hidden');
  document.getElementById('upload-results').classList.add('hidden');
  
  // Reset barra di progresso
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) { progressBar.style.transition = 'none'; progressBar.style.width = '0%'; }
  
  // Inizializza stato e avvia renderer continuo
  setProgress(0, total, '⏳', 'Preparazione...');
  startProgressRenderer();
  
  // Pausa breve per mostrare lo stato iniziale
  await new Promise(r => setTimeout(r, 100));
  // Riattiva transizione fluida
  if (progressBar) progressBar.style.transition = 'width 0.5s ease';

  for (let i = 0; i < total; i++) {
    const file = filesToProcess[i];
    const fileName = file ? file.name : `file_${i + 1}.pdf`;
    
    // Aggiorna stato progress (il renderer si occupa del DOM)
    setProgress(i, total, '📄 Estrazione testo:', fileName);

    try {
      if (!file) {
        throw new Error('File non accessibile');
      }

      // 1. Estrai testo
      const text = await extractTextFromPDF(file);
      
      if (!text || text.length < 50) {
        processingResults.skipped++;
        processingResults.details.push({ name: fileName, status: 'skipped', message: 'Testo insufficiente (PDF scansione?)' });
        continue;
      }

      // 2. Pre-classificazione LLM
      setProgress(i, total, '🤖 Analisi AI:', fileName);
      const classification = await preClassifyProgram(text);

      // 3. Valida risposta LLM
      if (!classification || typeof classification !== 'object') {
        throw new Error('Risposta LLM non valida');
      }

      // 3b. VALIDAZIONE POST-LLM: verifica e corregge scenario_zanichelli
      // Il LLM può sbagliare confondendo autori omonimi di editori diversi
      const validatedScenario = validateZanichelliScenario(classification);
      if (validatedScenario !== classification.scenario_zanichelli) {
        console.warn(`[Upload] Scenario corretto per ${fileName}: "${classification.scenario_zanichelli}" → "${validatedScenario}"`);
        classification.scenario_zanichelli = validatedScenario;
      }

      // 4. Salva su Supabase
      setProgress(i, total, '💾 Salvataggio:', fileName);
      const record = {
        user_id: session.user.id,
        docente_nome: classification.docente_nome || null,
        docente_email: classification.docente_email || null,
        ateneo: classification.ateneo || null,
        corso_laurea: classification.corso_laurea || null,
        classe_laurea: classification.classe_laurea || null,
        materia_inferita: classification.materia_inferita || null,
        manuali_citati: classification.manuali_citati || [],
        temi_principali: classification.temi_principali || [],
        scenario_zanichelli: classification.scenario_zanichelli || 'zanichelli_assente',
        testo_programma: text,
        pdf_storage_path: fileName
      };

      const { error } = await supabaseClient.from('programmi').insert(record);
      if (error) throw new Error(error.message);

      processingResults.success++;
      processingResults.details.push({ name: fileName, status: 'success', message: `${classification.docente_nome || 'Docente'} — ${classification.materia_inferita || 'Materia'}` });
      // Aggiorna il contatore file completato
      setProgress(i + 1, total, '✅ Completato:', fileName);

    } catch (error) {
      console.error(`Errore processing ${fileName}:`, error);
      processingResults.errors++;
      processingResults.details.push({ name: fileName, status: 'error', message: error.message });
    }

    // Pausa tra le chiamate (rate limiting)
    if (i < total - 1) {
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  // Ferma il renderer e mostra completamento
  stopProgressRenderer();
  
  // Aggiorna manualmente lo stato finale
  const finalBar = document.getElementById('progress-bar');
  const finalText = document.getElementById('progress-text');
  const finalDetail = document.getElementById('progress-detail');
  const finalTitle = document.getElementById('progress-title');
  if (finalBar) finalBar.style.width = '100%';
  if (finalText) finalText.textContent = `${total}/${total}`;
  if (finalTitle) finalTitle.textContent = 'Analisi completata!';
  if (finalDetail) finalDetail.textContent = `✅ Completato! ${processingResults.success} analizzati, ${processingResults.errors} errori, ${processingResults.skipped} saltati`;
  showResults();
  fileQueue = [];
  renderFileQueue();
  document.getElementById('btn-start-processing').disabled = false;
}

// NOTA: updateProgress e forceRender sono stati rimossi.
// Il sistema usa ora progressState + startProgressRenderer() che gira con requestAnimationFrame
// in modo indipendente dal loop di processing, garantendo aggiornamenti visivi continui.

// --- Mostra risultati ---
function showResults() {
  document.getElementById('upload-results').classList.remove('hidden');
  document.getElementById('result-success').textContent = processingResults.success;
  document.getElementById('result-errors').textContent = processingResults.errors;
  document.getElementById('result-skipped').textContent = processingResults.skipped;

  const detailsEl = document.getElementById('result-details');
  detailsEl.innerHTML = processingResults.details.map(d => {
    const icon = d.status === 'success' ? 'fa-check text-green-500' : d.status === 'error' ? 'fa-times text-red-500' : 'fa-forward text-yellow-500';
    const bg = d.status === 'success' ? 'bg-green-50' : d.status === 'error' ? 'bg-red-50' : 'bg-yellow-50';
    return `
      <div class="flex items-center gap-3 ${bg} rounded-lg px-3 py-2 text-sm">
        <i class="fas ${icon}"></i>
        <span class="font-medium text-gray-700">${d.name}</span>
        <span class="text-gray-500 text-xs">${d.message}</span>
      </div>`;
  }).join('');
}
