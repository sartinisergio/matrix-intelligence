// ==========================================
// MATRIX Intelligence — Upload & Pre-classificazione
// ==========================================

let fileQueue = [];
let processingResults = { success: 0, errors: 0, skipped: 0, details: [] };

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
// Controlla: editore esplicito "Zanichelli" + match con catalogo ZANICHELLI_CATALOG
function validateZanichelliScenario(classification) {
  const manuali = classification.manuali_citati || [];
  if (manuali.length === 0) return 'zanichelli_assente';
  
  const catalog = CONFIG.ZANICHELLI_CATALOG || [];
  
  // Per ogni manuale citato, verifica se è Zanichelli
  const manualiConFlag = manuali.map(m => {
    const editore = (m.editore || '').toLowerCase().trim();
    const autore = (m.autore || '').toLowerCase().trim();
    const titolo = (m.titolo || '').toLowerCase().trim();
    
    // 1. Editore esplicito "Zanichelli"
    if (editore.includes('zanichelli')) {
      return { ...m, _isZanichelli: true, _reason: 'editore esplicito' };
    }
    
    // 2. Editore esplicitamente NON Zanichelli → sicuramente non è Zanichelli
    const altriEditori = ['pearson', 'edises', 'edi-ses', 'mcgraw', 'utet', 'cea', 'piccin', 
                          'elsevier', 'springer', 'edra', 'ambrosiana', 'wiley', 'adelphi',
                          'hoepli', 'mondadori', 'il mulino', 'egea', 'giappichelli',
                          'giuffrè', 'cacucci', 'laterza', 'carocci', 'franco angeli',
                          'cortina', 'minerva', 'società editrice', 'esculapio', 'patron',
                          'bononia', 'clueb', 'aracne', 'ledizioni', 'vita e pensiero'];
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
  
  // Log per debug
  manualiConFlag.forEach(m => {
    console.log(`[Validazione] "${m.titolo}" di ${m.autore} (${m.editore}) → Zanichelli: ${m._isZanichelli} (${m._reason})`);
  });
  
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

  // Setup UI
  document.getElementById('btn-start-processing').disabled = true;
  document.getElementById('processing-progress').classList.remove('hidden');
  document.getElementById('upload-results').classList.add('hidden');

  processingResults = { success: 0, errors: 0, skipped: 0, details: [] };
  
  // Salva copie locali per evitare problemi di garbage collection
  const filesToProcess = [...fileQueue];
  const total = filesToProcess.length;

  for (let i = 0; i < total; i++) {
    const file = filesToProcess[i];
    const fileName = file ? file.name : `file_${i + 1}.pdf`;
    
    updateProgress(i, total, `📄 Estrazione testo: ${fileName}`);
    // Forza il browser a rendere l'aggiornamento della UI
    await new Promise(r => setTimeout(r, 50));

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
      updateProgress(i, total, `🤖 Analisi AI: ${fileName}`);
      await new Promise(r => setTimeout(r, 50));
      const classification = await preClassifyProgram(text);

      // 3. Valida risposta LLM
      if (!classification || typeof classification !== 'object') {
        throw new Error('Risposta LLM non valida');
      }

      // 3b. VALIDAZIONE POST-LLM: verifica scenario_zanichelli dai manuali citati
      const validatedScenario = validateZanichelliScenario(classification);
      if (validatedScenario !== classification.scenario_zanichelli) {
        console.warn(`[Upload] Scenario corretto per ${fileName}: "${classification.scenario_zanichelli}" → "${validatedScenario}"`);
        classification.scenario_zanichelli = validatedScenario;
      }

      // 4. Salva su Supabase
      updateProgress(i, total, `💾 Salvataggio: ${fileName}`);
      await new Promise(r => setTimeout(r, 50));
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

  // Mostra risultati
  // updateProgress usa (current+1), quindi per mostrare total/total passiamo total-1
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressDetail = document.getElementById('progress-detail');
  if (progressBar) progressBar.style.width = '100%';
  if (progressText) progressText.textContent = `${total}/${total}`;
  if (progressDetail) progressDetail.textContent = `✅ Completato! ${processingResults.success} analizzati, ${processingResults.errors} errori, ${processingResults.skipped} saltati`;
  await new Promise(r => setTimeout(r, 100));
  showResults();
  fileQueue = [];
  renderFileQueue();
  document.getElementById('btn-start-processing').disabled = false;
}

// --- Aggiorna progress bar ---
function updateProgress(current, total, detail) {
  // Calcola percentuale: usa (current+1) per mostrare che stiamo lavorando sul file corrente
  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressDetail = document.getElementById('progress-detail');
  
  if (progressBar) progressBar.style.width = Math.min(pct, 100) + '%';
  if (progressText) progressText.textContent = `${current + 1}/${total}`;
  if (progressDetail) progressDetail.textContent = detail;
  
  // Log per debug
  console.log(`[Upload] Progresso: ${current + 1}/${total} (${pct}%) - ${detail}`);
}

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
