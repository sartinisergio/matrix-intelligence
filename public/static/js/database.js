// ==========================================
// MATRIX Intelligence — Database Programmi
// Con sistema di validazione match catalogo
// ==========================================

let allPrograms = [];
let catalogColumnsReady = false; // Flag per verificare se le colonne match esistono

// --- Verifica/crea colonne match nella tabella programmi ---
async function ensureCatalogColumns() {
  if (catalogColumnsReady) return true;
  
  // Tenta una query di test per vedere se le colonne esistono
  try {
    const { data, error } = await supabaseClient
      .from('programmi')
      .select('manual_catalog_id')
      .limit(1);
    
    if (error && error.message.includes('manual_catalog_id')) {
      // Colonne non esistono — mostra istruzioni
      console.warn('[Database] Colonne match catalogo non presenti. Serve migration SQL.');
      showToast('Aggiungi le colonne match al database — vedi console per istruzioni', 'warning');
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MIGRATION NECESSARIA — Esegui questo SQL su Supabase:       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ALTER TABLE programmi                                        ║
║    ADD COLUMN IF NOT EXISTS manual_catalog_id TEXT,            ║
║    ADD COLUMN IF NOT EXISTS manual_catalog_title TEXT,         ║
║    ADD COLUMN IF NOT EXISTS manual_catalog_author TEXT,        ║
║    ADD COLUMN IF NOT EXISTS manual_catalog_publisher TEXT;     ║
║                                                               ║
║  Vai su Supabase → SQL Editor → incolla e Run                 ║
╚═══════════════════════════════════════════════════════════════╝`);
      return false;
    }
    
    catalogColumnsReady = true;
    return true;
  } catch (e) {
    console.warn('[Database] Verifica colonne fallita:', e);
    return false;
  }
}

// --- Migrazione automatica: promuove al database i programmi pre-staging ---
// Quando le colonne stato/dati_verificati vengono aggiunte, i vecchi programmi
// ricevono il default 'staging'. Questa funzione li identifica e li promuove
// automaticamente, perché erano già nel database prima dell'introduzione dello staging.
let migrationDone = false;
async function migrateOldPrograms(session) {
  if (migrationDone) return;
  migrationDone = true;
  
  try {
    // Cerca programmi con stato='staging' ma dati_verificati=false e SENZA il campo
    // che normalmente viene impostato dal nuovo upload (come il flag esplicito).
    // Criterio: programmi in staging che hanno created_at anteriore al 2026-02-16
    // (data di deploy dello staging) → sono programmi vecchi
    const cutoffDate = '2026-02-16T00:00:00Z';
    
    const { data: oldPrograms, error } = await supabaseClient
      .from('programmi')
      .select('id, stato, created_at')
      .eq('user_id', session.user.id)
      .or(`stato.is.null,and(stato.eq.staging,created_at.lt.${cutoffDate})`);
    
    if (error || !oldPrograms || oldPrograms.length === 0) return;
    
    // Filtra solo quelli che NON sono già 'database'
    const toMigrate = oldPrograms.filter(p => p.stato !== 'database');
    if (toMigrate.length === 0) return;
    
    console.log(`[Database] Trovati ${toMigrate.length} programmi pre-staging, migrazione a 'database'...`);
    
    // Aggiorna tutti: stato='database' e dati_verificati=true
    for (const p of toMigrate) {
      await supabaseClient
        .from('programmi')
        .update({ stato: 'database', dati_verificati: true })
        .eq('id', p.id);
    }
    
    showToast(`${toMigrate.length} programmi esistenti migrati al nuovo sistema`, 'info');
  } catch (e) {
    console.warn('[Database] Migrazione automatica fallita:', e);
  }
}

// --- Carica programmi dal database ---
async function loadDatabase() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  // Migrazione automatica dei programmi vecchi (senza campo stato)
  await migrateOldPrograms(session);

  // Assicura che il catalogo sia caricato (necessario per i match)
  await loadCatalog();
  
  // Verifica che le colonne match esistano in Supabase
  const columnsOk = await ensureCatalogColumns();

  try {
    const { data, error } = await supabaseClient
      .from('programmi')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('stato', 'database')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allPrograms = data || [];
    
    // Per ogni programma, calcola il match proposto se non già confermato
    allPrograms.forEach(p => {
      if (!p.manual_catalog_id) {
        const match = autoMatchManual(p);
        p._autoMatch = match; // match proposto (non salvato)
      }
    });
    
    populateFilters();
    applyFilters();
    updateValidationBanner();
  } catch (e) {
    showToast('Errore caricamento database: ' + e.message, 'error');
  }
}

// --- Auto-match: propone un manuale dal catalogo ---
function autoMatchManual(program) {
  const manuali = program.manuali_citati || [];
  const princ = manuali.find(m => m.ruolo === 'principale');
  if (!princ || !princ.titolo) return null;
  
  const found = findManualInCatalog(princ.titolo, princ.autore);
  if (!found) return null;
  
  return {
    id: found.id || null,
    title: found.title,
    author: found.author,
    publisher: found.publisher,
    is_zanichelli: found.type === 'zanichelli' || found.is_zanichelli === true || 
                   ['zanichelli', 'cea', 'ambrosiana'].includes((found.publisher || '').toLowerCase())
  };
}

// --- Banner di validazione in cima alla sezione ---
function updateValidationBanner() {
  const banner = document.getElementById('validation-banner');
  if (!banner) return;
  
  const unconfirmed = allPrograms.filter(p => !p.manual_catalog_id && p._autoMatch);
  const noMatch = allPrograms.filter(p => !p.manual_catalog_id && !p._autoMatch);
  const confirmed = allPrograms.filter(p => p.manual_catalog_id); // include NO_MANUAL, NOT_SPECIFIED, NOT_IN_CATALOG e match reali
  
  if (allPrograms.length === 0) {
    banner.classList.add('hidden');
    return;
  }
  
  if (unconfirmed.length === 0 && noMatch.length === 0) {
    // Tutto confermato — mostra opzione archiviazione
    const notArchived = confirmed.filter(p => !p.archiviato);
    const archivedCount = confirmed.filter(p => p.archiviato).length;
    
    let archivioBtn = '';
    if (notArchived.length > 0) {
      archivioBtn = `
        <button onclick="archiveAllConfirmed()" 
                class="px-4 py-2 bg-zanichelli-blue text-white rounded-lg text-sm font-medium hover:bg-zanichelli-dark transition-colors flex items-center gap-2 ml-auto">
          <i class="fas fa-archive"></i>
          Salva adozioni nell'Archivio (${notArchived.length})
        </button>`;
    }
    
    banner.innerHTML = `
      <div class="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
        <i class="fas fa-check-circle text-green-500 text-xl"></i>
        <div class="flex-1">
          <p class="font-medium text-green-800">Tutti i match sono confermati</p>
          <p class="text-sm text-green-600">
            ${confirmed.length} programmi pronti per le campagne
            ${archivedCount > 0 ? ` · ${archivedCount} già archiviati` : ''}
            ${notArchived.length > 0 ? ` · ${notArchived.length} da archiviare` : ''}
          </p>
        </div>
        ${archivioBtn}
      </div>`;
    banner.classList.remove('hidden');
    return;
  }
  
  banner.innerHTML = `
    <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div class="flex items-center gap-3">
        <i class="fas fa-exclamation-triangle text-amber-500 text-xl"></i>
        <div>
          <p class="font-medium text-amber-800">
            ${unconfirmed.length + noMatch.length} programmi richiedono verifica del manuale
          </p>
          <p class="text-sm text-amber-600">
            ${unconfirmed.length > 0 ? `${unconfirmed.length} con match proposto da confermare` : ''}
            ${unconfirmed.length > 0 && noMatch.length > 0 ? ' · ' : ''}
            ${noMatch.length > 0 ? `${noMatch.length} senza match — seleziona manualmente` : ''}
          </p>
        </div>
      </div>
      ${unconfirmed.length > 0 ? `
        <button onclick="confirmAllMatches()" 
                class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-2">
          <i class="fas fa-check-double"></i>
          Conferma tutti (${unconfirmed.length})
        </button>` : ''}
    </div>`;
  banner.classList.remove('hidden');
}

// --- Conferma tutti i match proposti ---
async function confirmAllMatches() {
  const unconfirmed = allPrograms.filter(p => !p.manual_catalog_id && p._autoMatch);
  if (unconfirmed.length === 0) return;
  
  if (!confirm(`Confermare il match proposto per ${unconfirmed.length} programmi?`)) return;
  
  let successCount = 0;
  for (const p of unconfirmed) {
    try {
      const { error } = await supabaseClient
        .from('programmi')
        .update({ 
          manual_catalog_id: p._autoMatch.id,
          manual_catalog_title: p._autoMatch.title,
          manual_catalog_author: p._autoMatch.author,
          manual_catalog_publisher: p._autoMatch.publisher
        })
        .eq('id', p.id);
      
      if (!error) {
        p.manual_catalog_id = p._autoMatch.id;
        p.manual_catalog_title = p._autoMatch.title;
        p.manual_catalog_author = p._autoMatch.author;
        p.manual_catalog_publisher = p._autoMatch.publisher;
        successCount++;
      }
    } catch (e) {
      console.error('Errore conferma match per', p.docente_nome, e);
    }
  }
  
  showToast(`${successCount} match confermati!`, 'success');
  applyFilters();
  updateValidationBanner();
}

// --- Archivia tutti i programmi confermati nella tabella adozioni ---
async function archiveAllConfirmed() {
  const confirmed = allPrograms.filter(p => p.manual_catalog_id && !p.archiviato);
  if (confirmed.length === 0) {
    showToast('Nessun programma da archiviare', 'warning');
    return;
  }
  
  if (!confirm(`Archiviare ${confirmed.length} programmi confermati nell'Archivio Adozioni?\n\nPer ogni programma verranno salvati tutti i manuali citati (principale + alternativi).`)) return;
  
  let successCount = 0;
  let adozioniCount = 0;
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('Sessione scaduta, effettua il login', 'error');
    return;
  }
  
  for (const p of confirmed) {
    try {
      const manuali = p.manuali_citati || [];
      const adozioni = [];
      
      // Caso speciale: programma senza manuale o non indicato
      if (p.manual_catalog_id === 'NO_MANUAL' || p.manual_catalog_id === 'NOT_SPECIFIED') {
        const label = p.manual_catalog_id === 'NO_MANUAL' ? 'Nessun manuale adottato' : 'Non indicato nel programma';
        adozioni.push({
          user_id: session.user.id,
          programma_id: p.id,
          ateneo: p.ateneo || null,
          corso_laurea: p.corso_laurea || null,
          classe_laurea: p.classe_laurea || null,
          insegnamento: p.materia_inferita || null,
          docente_nome: p.docente_nome || null,
          manuale_titolo: label,
          manuale_autore: '—',
          manuale_editore: '—',
          ruolo: 'nessuno',
          is_zanichelli: false,
          anno_accademico: extractAnnoAccademico(p.testo_programma) || null
        });
      } else {
        // Crea una riga per ogni manuale citato
        for (const m of manuali) {
          adozioni.push({
            user_id: session.user.id,
            programma_id: p.id,
            ateneo: p.ateneo || null,
            corso_laurea: p.corso_laurea || null,
            classe_laurea: p.classe_laurea || null,
            insegnamento: p.materia_inferita || null,
            docente_nome: p.docente_nome || null,
            manuale_titolo: m.titolo || null,
            manuale_autore: m.autore || null,
            manuale_editore: m.editore || null,
            ruolo: m.ruolo || 'alternativo',
            is_zanichelli: !!(m.editore && m.editore.toLowerCase().includes('zanichelli')),
            anno_accademico: extractAnnoAccademico(p.testo_programma) || null
          });
        }
        
        // Se nessun manuale citato ma c'è un match catalogo confermato, usa quello
        if (adozioni.length === 0 && p.manual_catalog_id && p.manual_catalog_id !== 'NOT_IN_CATALOG') {
          adozioni.push({
            user_id: session.user.id,
            programma_id: p.id,
            ateneo: p.ateneo || null,
            corso_laurea: p.corso_laurea || null,
            classe_laurea: p.classe_laurea || null,
            insegnamento: p.materia_inferita || null,
            docente_nome: p.docente_nome || null,
            manuale_titolo: p.manual_catalog_title || null,
            manuale_autore: p.manual_catalog_author || null,
            manuale_editore: p.manual_catalog_publisher || null,
            ruolo: 'principale',
            is_zanichelli: !!(p.manual_catalog_publisher && p.manual_catalog_publisher.toLowerCase().includes('zanichelli')),
            anno_accademico: extractAnnoAccademico(p.testo_programma) || null
          });
        }
      }
      
      if (adozioni.length === 0) continue;
      
      // Prima elimina eventuali adozioni precedenti per questo programma (evita duplicati)
      await supabaseClient.from('adozioni').delete().eq('programma_id', p.id);
      
      // Inserisci le nuove adozioni
      const { error: insertErr } = await supabaseClient.from('adozioni').insert(adozioni);
      if (insertErr) throw insertErr;
      
      // Segna il programma come archiviato
      const { error: updateErr } = await supabaseClient
        .from('programmi')
        .update({ archiviato: true })
        .eq('id', p.id);
      
      if (!updateErr) {
        p.archiviato = true;
        successCount++;
        adozioniCount += adozioni.length;
      }
    } catch (e) {
      console.error('[Archivio] Errore per', p.docente_nome, ':', e);
    }
  }
  
  showToast(`${successCount} programmi archiviati (${adozioniCount} adozioni create)!`, 'success');
  applyFilters();
  updateValidationBanner();
}

// --- Estrai anno accademico dal testo del programma ---
function extractAnnoAccademico(testo) {
  if (!testo) return null;
  // Cerca pattern tipo "2025/2026" o "2025-2026" o "A.A. 2025/2026"
  const match = testo.match(/(\d{4})[\/\-](\d{4})/);
  if (match) return `${match[1]}/${match[2]}`;
  return null;
}

// --- Conferma singolo match ---
async function confirmSingleMatch(programId) {
  const p = allPrograms.find(p => p.id === programId);
  if (!p || !p._autoMatch) return;
  
  try {
    const { error } = await supabaseClient
      .from('programmi')
      .update({ 
        manual_catalog_id: p._autoMatch.id,
        manual_catalog_title: p._autoMatch.title,
        manual_catalog_author: p._autoMatch.author,
        manual_catalog_publisher: p._autoMatch.publisher
      })
      .eq('id', p.id);
    
    if (error) throw error;
    
    p.manual_catalog_id = p._autoMatch.id;
    p.manual_catalog_title = p._autoMatch.title;
    p.manual_catalog_author = p._autoMatch.author;
    p.manual_catalog_publisher = p._autoMatch.publisher;
    
    showToast('Match confermato!', 'success');
    applyFilters();
    updateValidationBanner();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// --- Marca un programma come "Nessun manuale adottato" o "Non indicato" ---
async function markNoManual(programId, type) {
  const p = allPrograms.find(p => p.id === programId);
  if (!p) return;
  
  const label = type === 'NO_MANUAL' ? 'Nessun manuale adottato' : 'Non indicato nel programma';
  
  try {
    const { error } = await supabaseClient
      .from('programmi')
      .update({ 
        manual_catalog_id: type,
        manual_catalog_title: label,
        manual_catalog_author: '—',
        manual_catalog_publisher: '—'
      })
      .eq('id', p.id);
    
    if (error) throw error;
    
    p.manual_catalog_id = type;
    p.manual_catalog_title = label;
    p.manual_catalog_author = '—';
    p.manual_catalog_publisher = '—';
    
    showToast(`Programma marcato: ${label}`, 'success');
    applyFilters();
    updateValidationBanner();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// --- Annulla lo stato manuale (riporta a "nessun match") ---
async function resetManualStatus(programId) {
  const p = allPrograms.find(p => p.id === programId);
  if (!p) return;
  
  try {
    const { error } = await supabaseClient
      .from('programmi')
      .update({ 
        manual_catalog_id: null,
        manual_catalog_title: null,
        manual_catalog_author: null,
        manual_catalog_publisher: null
      })
      .eq('id', p.id);
    
    if (error) throw error;
    
    p.manual_catalog_id = null;
    p.manual_catalog_title = null;
    p.manual_catalog_author = null;
    p.manual_catalog_publisher = null;
    
    showToast('Stato manuale annullato', 'success');
    applyFilters();
    updateValidationBanner();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// --- Apri dropdown selezione manuale dal catalogo ---
function openManualSelector(programId) {
  const p = allPrograms.find(p => p.id === programId);
  if (!p) return;
  
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  
  // Raggruppa manuali per materia
  const manualsBySubject = {};
  (catalogManuals || []).forEach(m => {
    const subj = m.subject || 'Altro';
    if (!manualsBySubject[subj]) manualsBySubject[subj] = [];
    manualsBySubject[subj].push(m);
  });
  
  // Manuali citati dal docente per contesto
  const manualiCitati = (p.manuali_citati || []).map(m => 
    `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${m.autore || '?'} — ${m.titolo || '?'} (${m.editore || '?'})</span>`
  ).join(' ');
  
  let optionsHtml = '<option value="">— Seleziona dal catalogo —</option>';
  optionsHtml += '<option value="__none__">❌ Manuale non presente nel catalogo</option>';
  
  Object.keys(manualsBySubject).sort().forEach(subj => {
    optionsHtml += `<optgroup label="${subj}">`;
    manualsBySubject[subj].forEach(m => {
      const isZan = m.type === 'zanichelli' || m.is_zanichelli || 
                    ['zanichelli', 'cea', 'ambrosiana'].includes((m.publisher || '').toLowerCase());
      const icon = isZan ? '🔵' : '⚪';
      const selected = (p.manual_catalog_id === m.id || 
                        (p._autoMatch && p._autoMatch.id === m.id)) ? 'selected' : '';
      optionsHtml += `<option value="${m.id || ''}" data-title="${m.title}" data-author="${m.author}" data-publisher="${m.publisher}" ${selected}>
        ${icon} ${m.author} — ${m.title} (${m.publisher})
      </option>`;
    });
    optionsHtml += '</optgroup>';
  });
  
  content.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="fas fa-book-open text-zanichelli-light mr-2"></i>
        Seleziona manuale principale dal catalogo
      </h3>
      
      <div class="bg-gray-50 rounded-lg p-3">
        <p class="text-sm text-gray-600"><strong>Docente:</strong> ${p.docente_nome || '—'} (${p.ateneo || '—'})</p>
        <p class="text-sm text-gray-600"><strong>Materia:</strong> ${p.materia_inferita || '—'}</p>
        <p class="text-sm text-gray-500 mt-2"><strong>Manuali citati nel PDF:</strong></p>
        <div class="flex flex-wrap gap-1 mt-1">${manualiCitati || '<span class="text-gray-400 text-xs">Nessuno</span>'}</div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Manuale principale nel catalogo Matrix</label>
        <select id="manual-select" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm">
          ${optionsHtml}
        </select>
        <p class="text-xs text-gray-400 mt-1">🔵 = Zanichelli/CEA · ⚪ = Concorrente</p>
      </div>
      
      <div class="flex gap-3 pt-2">
        <button onclick="saveManualSelection('${p.id}')" 
                class="flex-1 py-2 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
          <i class="fas fa-check mr-1"></i>Conferma selezione
        </button>
        <button onclick="closeModal()" 
                class="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
          Annulla
        </button>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// --- Salva selezione manuale ---
async function saveManualSelection(programId) {
  const select = document.getElementById('manual-select');
  const value = select.value;
  
  if (!value) {
    showToast('Seleziona un manuale', 'warning');
    return;
  }
  
  const p = allPrograms.find(p => p.id === programId);
  if (!p) return;
  
  let updateData;
  if (value === '__none__') {
    updateData = {
      manual_catalog_id: 'NOT_IN_CATALOG',
      manual_catalog_title: null,
      manual_catalog_author: null,
      manual_catalog_publisher: null
    };
  } else {
    const opt = select.options[select.selectedIndex];
    updateData = {
      manual_catalog_id: value,
      manual_catalog_title: opt.dataset.title || null,
      manual_catalog_author: opt.dataset.author || null,
      manual_catalog_publisher: opt.dataset.publisher || null
    };
  }
  
  try {
    const { error } = await supabaseClient
      .from('programmi')
      .update(updateData)
      .eq('id', p.id);
    
    if (error) throw error;
    
    Object.assign(p, updateData);
    
    showToast('Manuale confermato!', 'success');
    closeModal();
    applyFilters();
    updateValidationBanner();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// --- Popola i select dei filtri ---
function populateFilters() {
  const materie = [...new Set(allPrograms.map(p => p.materia_inferita).filter(Boolean))].sort();
  const atenei = [...new Set(allPrograms.map(p => p.ateneo).filter(Boolean))].sort();

  const materiaSelect = document.getElementById('filter-materia');
  const ateneoSelect = document.getElementById('filter-ateneo');

  const currentMateria = materiaSelect.value;
  const currentAteneo = ateneoSelect.value;

  materiaSelect.innerHTML = '<option value="">Tutte le materie</option>' +
    materie.map(m => `<option value="${m}">${m}</option>`).join('');
  ateneoSelect.innerHTML = '<option value="">Tutti gli atenei</option>' +
    atenei.map(a => `<option value="${a}">${a}</option>`).join('');

  materiaSelect.value = currentMateria;
  ateneoSelect.value = currentAteneo;
}

// --- Applica filtri ---
function applyFilters() {
  const search = document.getElementById('filter-search').value.toLowerCase();
  const materia = document.getElementById('filter-materia').value;
  const ateneo = document.getElementById('filter-ateneo').value;
  const scenario = document.getElementById('filter-scenario').value;

  let filtered = allPrograms.filter(p => {
    if (search) {
      const searchStr = `${p.docente_nome} ${p.ateneo} ${p.materia_inferita} ${p.corso_laurea}`.toLowerCase();
      if (!searchStr.includes(search)) return false;
    }
    if (materia && p.materia_inferita !== materia) return false;
    if (ateneo && p.ateneo !== ateneo) return false;
    if (scenario && p.scenario_zanichelli !== scenario) return false;
    return true;
  });

  renderTable(filtered);
  document.getElementById('db-count').textContent = `${filtered.length} programmi trovati`;
}

// --- Reset filtri ---
function resetFilters() {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-materia').value = '';
  document.getElementById('filter-ateneo').value = '';
  document.getElementById('filter-scenario').value = '';
  applyFilters();
}

// --- Render vista ad albero: Materia → Ateneo → Classe ---
function renderTable(programs) {
  const container = document.getElementById('db-tree-view') || document.getElementById('db-table-body');

  if (programs.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-400 py-12">
        <i class="fas fa-inbox text-3xl mb-2 block"></i>
        Nessun programma trovato. Carica dei PDF dalla sezione Upload.
      </div>`;
    return;
  }

  // --- Raggruppa: Materia → Ateneo → Classe → [programmi] ---
  const tree = {};
  programs.forEach(p => {
    const materia = p.materia_inferita || 'Materia non definita';
    const ateneo = p.ateneo || 'Ateneo non definito';
    const classe = p.classe_laurea || 'Classe non definita';
    if (!tree[materia]) tree[materia] = {};
    if (!tree[materia][ateneo]) tree[materia][ateneo] = {};
    if (!tree[materia][ateneo][classe]) tree[materia][ateneo][classe] = [];
    tree[materia][ateneo][classe].push(p);
  });

  // --- Contatori e statistiche per ogni livello ---
  let html = '';
  const materieKeys = Object.keys(tree).sort();

  materieKeys.forEach((materia, mIdx) => {
    const atenei = tree[materia];
    const ateneiKeys = Object.keys(atenei).sort();
    const materiaCount = Object.values(atenei).reduce((sum, classes) => 
      sum + Object.values(classes).reduce((s, progs) => s + progs.length, 0), 0);
    
    // Conta confermati per materia
    const materiaConfirmed = Object.values(atenei).reduce((sum, classes) => 
      sum + Object.values(classes).reduce((s, progs) => s + progs.filter(p => p.manual_catalog_id).length, 0), 0);

    const materiaId = `materia-${mIdx}`;

    html += `
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
             onclick="toggleTreeNode('${materiaId}')">
          <div class="flex items-center gap-3">
            <i id="icon-${materiaId}" class="fas fa-chevron-right text-gray-400 text-sm transition-transform duration-200"></i>
            <div>
              <span class="font-semibold text-gray-800 text-base">${materia}</span>
              <span class="ml-2 text-xs text-gray-400">${ateneiKeys.length} aten${ateneiKeys.length === 1 ? 'eo' : 'ei'}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 bg-zanichelli-accent text-zanichelli-blue rounded-full text-xs font-medium">
              ${materiaCount} programm${materiaCount === 1 ? 'a' : 'i'}
            </span>
            ${materiaConfirmed > 0 ? `<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              <i class="fas fa-check-circle mr-1"></i>${materiaConfirmed} confermati
            </span>` : ''}
            ${materiaConfirmed < materiaCount ? `<span class="px-2 py-1 bg-amber-100 text-amber-600 rounded-full text-xs">
              <i class="fas fa-clock mr-1"></i>${materiaCount - materiaConfirmed} da verificare
            </span>` : ''}
          </div>
        </div>

        <div id="${materiaId}" class="hidden border-t">`;

    ateneiKeys.forEach((ateneo, aIdx) => {
      const classi = atenei[ateneo];
      const classiKeys = Object.keys(classi).sort();
      const ateneoCount = Object.values(classi).reduce((s, progs) => s + progs.length, 0);
      const ateneoId = `${materiaId}-ateneo-${aIdx}`;

      html += `
          <div class="border-b last:border-b-0">
            <div class="flex items-center justify-between px-4 py-2.5 pl-10 cursor-pointer hover:bg-blue-50/50 transition-colors"
                 onclick="toggleTreeNode('${ateneoId}')">
              <div class="flex items-center gap-2">
                <i id="icon-${ateneoId}" class="fas fa-chevron-right text-gray-300 text-xs transition-transform duration-200"></i>
                <i class="fas fa-university text-zanichelli-light text-sm"></i>
                <span class="font-medium text-gray-700">${ateneo}</span>
              </div>
              <span class="text-xs text-gray-400">${ateneoCount} programm${ateneoCount === 1 ? 'a' : 'i'} · ${classiKeys.length} class${classiKeys.length === 1 ? 'e' : 'i'}</span>
            </div>

            <div id="${ateneoId}" class="hidden">`;

      classiKeys.forEach((classe, cIdx) => {
        const progs = classi[classe];
        const classeId = `${ateneoId}-classe-${cIdx}`;

        html += `
              <div class="border-t border-dashed">
                <div class="flex items-center justify-between px-4 py-2 pl-16 cursor-pointer hover:bg-gray-50 transition-colors"
                     onclick="toggleTreeNode('${classeId}')">
                  <div class="flex items-center gap-2">
                    <i id="icon-${classeId}" class="fas fa-chevron-right text-gray-300 text-xs transition-transform duration-200"></i>
                    <i class="fas fa-graduation-cap text-gray-400 text-xs"></i>
                    <span class="text-sm text-gray-600">${classe}</span>
                  </div>
                  <span class="text-xs text-gray-400">${progs.length} docent${progs.length === 1 ? 'e' : 'i'}</span>
                </div>

                <div id="${classeId}" class="hidden">`;

        // --- Righe dei singoli programmi ---
        progs.forEach(p => {
          const mainManual = (p.manuali_citati || []).find(m => m.ruolo === 'principale');
          const manualText = mainManual ? `${mainManual.autore || ''} — ${mainManual.titolo || ''}` : '—';

          // Colore per scenario
          const rowBg = p.scenario_zanichelli === 'zanichelli_principale' ? 'bg-green-50/30' :
                        p.scenario_zanichelli === 'zanichelli_alternativo' ? 'bg-yellow-50/30' : '';

          // Match badge compatto
          let matchBadge = '';
          const specialIds = ['NOT_IN_CATALOG', 'NO_MANUAL', 'NOT_SPECIFIED'];
          const isConfirmed = p.manual_catalog_id && !specialIds.includes(p.manual_catalog_id);
          const isNoManual = p.manual_catalog_id === 'NO_MANUAL';
          const isNotSpecified = p.manual_catalog_id === 'NOT_SPECIFIED';
          const isNotInCatalog = p.manual_catalog_id === 'NOT_IN_CATALOG';
          const isDecided = isConfirmed || isNoManual || isNotSpecified || isNotInCatalog;

          if (isDecided) {
            let detailLabel = '';
            let detailColor = 'green';
            if (isConfirmed) {
              detailLabel = truncate(p.manual_catalog_title || '', 25);
            } else if (isNotInCatalog) {
              detailLabel = 'Non in catalogo';
              detailColor = 'gray';
            } else if (isNoManual) {
              detailLabel = 'Nessun manuale';
              detailColor = 'purple';
            } else if (isNotSpecified) {
              detailLabel = 'Non indicato';
              detailColor = 'orange';
            }
            matchBadge = `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                <i class="fas fa-check-circle"></i>
              </span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-${detailColor}-50 text-${detailColor}-600 rounded text-[10px]">
                ${detailLabel}
              </span>`;
          } else if (p._autoMatch) {
            matchBadge = `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] animate-pulse">
                <i class="fas fa-question-circle"></i> Da confermare
              </span>`;
          } else {
            matchBadge = `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">
                <i class="fas fa-times-circle"></i> Nessun match
              </span>`;
          }

          html += `
                  <div class="flex items-center justify-between px-4 py-2 pl-20 ${rowBg} hover:bg-gray-100/50 transition-colors cursor-pointer border-t border-dotted border-gray-100"
                       onclick="showProgramDetail('${p.id}')">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <i class="fas fa-user-tie text-gray-300 text-xs flex-shrink-0"></i>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-gray-800 text-sm">${p.docente_nome || '—'}</span>
                          ${p.docente_email ? `<span class="text-[10px] text-gray-400 truncate">${p.docente_email}</span>` : ''}
                          ${p.archiviato ? '<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px]"><i class="fas fa-archive text-[7px]"></i>Arch.</span>' : ''}
                        </div>
                        <div class="text-[10px] text-gray-400 truncate">${truncate(manualText, 50)}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 flex-shrink-0">
                      ${matchBadge}
                      ${scenarioBadge(p.scenario_zanichelli)}
                      <div class="flex items-center gap-1 ml-2">
                        <button onclick="event.stopPropagation(); openMatchOptions('${p.id}', event)" 
                                class="text-gray-400 hover:text-zanichelli-blue text-xs p-1" title="Gestisci match">
                          <i class="fas fa-cog"></i>
                        </button>
                        <button onclick="event.stopPropagation(); editProgram('${p.id}')" 
                                class="text-gray-400 hover:text-zanichelli-blue text-xs p-1" title="Modifica">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteProgram('${p.id}')" 
                                class="text-gray-400 hover:text-red-500 text-xs p-1" title="Elimina">
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  </div>`;
        });

        html += `
                </div>
              </div>`;
      });

      html += `
            </div>
          </div>`;
    });

    html += `
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// --- Toggle apertura/chiusura nodo albero ---
function toggleTreeNode(id) {
  const node = document.getElementById(id);
  const icon = document.getElementById('icon-' + id);
  if (!node) return;
  
  const isHidden = node.classList.contains('hidden');
  node.classList.toggle('hidden');
  
  if (icon) {
    if (isHidden) {
      icon.style.transform = 'rotate(90deg)';
    } else {
      icon.style.transform = 'rotate(0deg)';
    }
  }
}

// --- Menu opzioni match (popup contestuale) ---
function openMatchOptions(programId, event) {
  event.stopPropagation();
  const p = allPrograms.find(p => p.id === programId);
  if (!p) return;

  // Rimuovi menu esistente
  const existing = document.getElementById('match-options-popup');
  if (existing) existing.remove();

  const rect = event.target.closest('button').getBoundingClientRect();
  
  const specialIds = ['NOT_IN_CATALOG', 'NO_MANUAL', 'NOT_SPECIFIED'];
  const isDecided = p.manual_catalog_id != null;
  
  let options = `
    <div id="match-options-popup" class="fixed bg-white rounded-xl shadow-xl border p-2 z-50 min-w-[200px]"
         style="top: ${rect.bottom + 4}px; right: ${window.innerWidth - rect.right}px;">
      <div class="text-[10px] text-gray-400 px-3 py-1 uppercase tracking-wide">Gestisci match</div>
      <button onclick="openManualSelector('${p.id}'); closeMatchPopup();"
              class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg flex items-center gap-2">
        <i class="fas fa-search text-zanichelli-light"></i> Cerca nel catalogo
      </button>
      <button onclick="markNoManual('${p.id}', 'NO_MANUAL'); closeMatchPopup();"
              class="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2">
        <i class="fas fa-book-open"></i> Nessun manuale adottato
      </button>
      <button onclick="markNoManual('${p.id}', 'NOT_SPECIFIED'); closeMatchPopup();"
              class="w-full text-left px-3 py-2 text-sm text-orange-500 hover:bg-orange-50 rounded-lg flex items-center gap-2">
        <i class="fas fa-question"></i> Non indicato nel programma
      </button>
      ${isDecided ? `
      <div class="border-t my-1"></div>
      <button onclick="resetManualStatus('${p.id}'); closeMatchPopup();"
              class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2">
        <i class="fas fa-undo"></i> Annulla conferma
      </button>` : ''}
    </div>`;

  document.body.insertAdjacentHTML('beforeend', options);

  // Chiudi al click fuori
  setTimeout(() => {
    document.addEventListener('click', closeMatchPopup, { once: true });
  }, 10);
}

function closeMatchPopup() {
  const popup = document.getElementById('match-options-popup');
  if (popup) popup.remove();
}

// --- Dettaglio programma (modale) ---
function showProgramDetail(id) {
  const p = allPrograms.find(p => p.id === id);
  if (!p) return;

  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  const manuali = (p.manuali_citati || []).map(m => `
    <div class="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
      <i class="fas fa-book text-zanichelli-light mt-1"></i>
      <div>
        <p class="font-medium text-gray-800">${m.titolo || 'N/D'}</p>
        <p class="text-sm text-gray-500">${m.autore || ''} ${m.editore ? '— ' + m.editore : ''}</p>
        <span class="text-xs ${m.ruolo === 'principale' ? 'text-green-600' : 'text-gray-400'}">${m.ruolo || ''}</span>
      </div>
    </div>
  `).join('');

  const temi = (p.temi_principali || []).map(t => 
    `<span class="px-2 py-1 bg-zanichelli-accent text-zanichelli-blue rounded-full text-xs">${t}</span>`
  ).join('');

  // Match info nel dettaglio modale
  let matchInfo = '';
  if (p.manual_catalog_id && !['NOT_IN_CATALOG', 'NO_MANUAL', 'NOT_SPECIFIED'].includes(p.manual_catalog_id)) {
    matchInfo = `
      <div class="bg-green-50 border border-green-200 rounded-lg p-3">
        <p class="text-sm font-medium text-green-800"><i class="fas fa-check-circle mr-1"></i>Match catalogo confermato</p>
        <p class="text-sm text-green-700">${p.manual_catalog_author || ''} — ${p.manual_catalog_title || ''} (${p.manual_catalog_publisher || ''})</p>
      </div>`;
  } else if (p.manual_catalog_id === 'NOT_IN_CATALOG') {
    matchInfo = `
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p class="text-sm font-medium text-gray-700"><i class="fas fa-check-circle text-green-500 mr-1"></i>Confermato — <i class="fas fa-minus-circle text-gray-400 mr-1"></i>Manuale non presente nel catalogo</p>
      </div>`;
  } else if (p.manual_catalog_id === 'NO_MANUAL') {
    matchInfo = `
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p class="text-sm font-medium text-purple-700"><i class="fas fa-check-circle text-green-500 mr-1"></i>Confermato — <i class="fas fa-book-open mr-1"></i>Nessun manuale adottato</p>
        <p class="text-xs text-purple-500 mt-1">Il docente non adotta un testo specifico (usa dispense, slide o appunti)</p>
      </div>`;
  } else if (p.manual_catalog_id === 'NOT_SPECIFIED') {
    matchInfo = `
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p class="text-sm font-medium text-orange-600"><i class="fas fa-check-circle text-green-500 mr-1"></i>Confermato — <i class="fas fa-question mr-1"></i>Non indicato nel programma</p>
        <p class="text-xs text-orange-400 mt-1">Il programma non specifica il manuale adottato — serve indagine</p>
      </div>`;
  } else if (p._autoMatch) {
    matchInfo = `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p class="text-sm font-medium text-amber-800"><i class="fas fa-question-circle mr-1"></i>Match proposto (non confermato)</p>
        <p class="text-sm text-amber-700">${p._autoMatch.author} — ${p._autoMatch.title} (${p._autoMatch.publisher})</p>
        <button onclick="confirmSingleMatch('${p.id}'); closeModal(); setTimeout(()=>showProgramDetail('${p.id}'), 500);" 
                class="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
          <i class="fas fa-check mr-1"></i>Conferma
        </button>
      </div>`;
  }

  content.innerHTML = `
    <div class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Docente</label>
          <p class="font-medium text-gray-800">${p.docente_nome || '—'}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Email</label>
          <p class="text-gray-600">${p.docente_email || '—'}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Ateneo</label>
          <p class="text-gray-600">${p.ateneo || '—'}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Corso di Laurea</label>
          <p class="text-gray-600">${p.corso_laurea || '—'}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Classe di Laurea</label>
          <p class="text-gray-600">${p.classe_laurea || '—'}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Materia Inferita</label>
          <p class="text-gray-600">${p.materia_inferita || '—'}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Scenario Zanichelli</label>
          <div class="mt-1">${scenarioBadge(p.scenario_zanichelli)}</div>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide">Data inserimento</label>
          <p class="text-gray-600">${formatDate(p.created_at)}</p>
        </div>
      </div>

      ${matchInfo}

      <div>
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Temi Principali</label>
        <div class="flex flex-wrap gap-2">${temi || '<span class="text-gray-400">Nessun tema</span>'}</div>
      </div>

      <div>
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Manuali Citati</label>
        <div class="space-y-2">${manuali || '<p class="text-gray-400">Nessun manuale citato</p>'}</div>
      </div>

      <div>
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">File PDF Originale</label>
        <p class="text-sm text-gray-500"><i class="fas fa-file-pdf text-red-400 mr-1"></i>${p.pdf_storage_path || '—'}</p>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

// --- Modifica programma ---
async function editProgram(id) {
  const p = allPrograms.find(p => p.id === id);
  if (!p) return;

  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <form id="edit-form" onsubmit="saveEditProgram(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Docente</label>
          <input type="text" id="edit-docente" value="${p.docente_nome || ''}" 
                 class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" id="edit-email" value="${p.docente_email || ''}" 
                 class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ateneo</label>
          <input type="text" id="edit-ateneo" value="${p.ateneo || ''}" 
                 class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Materia Inferita</label>
          <input type="text" id="edit-materia" value="${p.materia_inferita || ''}" 
                 class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Corso di Laurea</label>
          <input type="text" id="edit-corso" value="${p.corso_laurea || ''}" 
                 class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Classe di Laurea</label>
          <input type="text" id="edit-classe" value="${p.classe_laurea || ''}" 
                 class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Scenario Zanichelli</label>
        <select id="edit-scenario" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
          <option value="zanichelli_principale" ${p.scenario_zanichelli === 'zanichelli_principale' ? 'selected' : ''}>Zanichelli Principale</option>
          <option value="zanichelli_alternativo" ${p.scenario_zanichelli === 'zanichelli_alternativo' ? 'selected' : ''}>Zanichelli Alternativo</option>
          <option value="zanichelli_assente" ${p.scenario_zanichelli === 'zanichelli_assente' ? 'selected' : ''}>Zanichelli Assente</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Temi principali (separati da virgola)</label>
        <input type="text" id="edit-temi" value="${(p.temi_principali || []).join(', ')}" 
               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
      </div>
      <div class="flex gap-3 pt-2">
        <button type="submit" class="flex-1 py-2 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
          <i class="fas fa-save mr-1"></i>Salva Modifiche
        </button>
        <button type="button" onclick="closeModal()" class="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
          Annulla
        </button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
}

// --- Salva modifiche programma ---
async function saveEditProgram(event, id) {
  event.preventDefault();

  const updates = {
    docente_nome: document.getElementById('edit-docente').value || null,
    docente_email: document.getElementById('edit-email').value || null,
    ateneo: document.getElementById('edit-ateneo').value || null,
    materia_inferita: document.getElementById('edit-materia').value || null,
    corso_laurea: document.getElementById('edit-corso').value || null,
    classe_laurea: document.getElementById('edit-classe').value || null,
    scenario_zanichelli: document.getElementById('edit-scenario').value,
    temi_principali: document.getElementById('edit-temi').value.split(',').map(t => t.trim()).filter(Boolean),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabaseClient.from('programmi').update(updates).eq('id', id);
    if (error) throw error;

    showToast('Programma aggiornato!', 'success');
    closeModal();
    loadDatabase();
  } catch (e) {
    showToast('Errore salvataggio: ' + e.message, 'error');
  }
}

// --- Elimina programma ---
async function deleteProgram(id) {
  if (!confirm('Eliminare questo programma? L\'operazione non è reversibile.')) return;

  try {
    const { error } = await supabaseClient.from('programmi').delete().eq('id', id);
    if (error) throw error;

    showToast('Programma eliminato', 'success');
    loadDatabase();
  } catch (e) {
    showToast('Errore eliminazione: ' + e.message, 'error');
  }
}
