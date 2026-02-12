// ==========================================
// MATRIX Intelligence — Sincronizzazione dati da Matrix
// ==========================================
// Scarica framework_catalog.json e manual_catalog.json da Matrix (GitHub),
// poi scarica i file individuali (framework completi + manuali con capitoli)
// e assembla i JSON nel formato usato da Intelligence.
//
// Logica incrementale:
// - Prima sync: scarica tutto
// - Sync successive: confronta con dati locali, scarica solo le differenze

const MATRIX_GITHUB_BASE = 'https://raw.githubusercontent.com/sartinisergio/matrix-analisi-programmi/main';

// ===================================================
// ENTRY POINT — chiamato dal bottone "Sincronizza"
// ===================================================

async function syncFromMatrix() {
  const statusEl = document.getElementById('sync-status');
  const progressEl = document.getElementById('sync-progress');
  const progressBar = document.getElementById('sync-progress-bar');
  const progressText = document.getElementById('sync-progress-text');
  const detailEl = document.getElementById('sync-detail');

  if (!statusEl) return;

  try {
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Connessione a Matrix (GitHub)...';
    progressEl?.classList.remove('hidden');
    updateProgress(0, 'Scaricamento cataloghi...');

    // --- STEP 1: Scarica i due cataloghi da Matrix ---
    const [remoteManualsRes, remoteFrameworksRes] = await Promise.all([
      fetch(`${MATRIX_GITHUB_BASE}/manual_catalog.json`),
      fetch(`${MATRIX_GITHUB_BASE}/framework_catalog.json`)
    ]);

    if (!remoteManualsRes.ok) throw new Error('Impossibile scaricare manual_catalog.json da Matrix');
    if (!remoteFrameworksRes.ok) throw new Error('Impossibile scaricare framework_catalog.json da Matrix');

    const remoteManualsCatalog = await remoteManualsRes.json();
    const remoteFrameworksCatalog = await remoteFrameworksRes.json();

    const remoteManuals = remoteManualsCatalog.manuals || [];
    const remoteFrameworks = remoteFrameworksCatalog.frameworks || [];

    updateProgress(5, `Cataloghi scaricati: ${remoteManuals.length} manuali, ${remoteFrameworks.length} framework`);

    // --- STEP 2: Carica dati locali correnti per confronto incrementale ---
    let localManuals = [];
    let localFrameworks = [];
    try {
      const [localManRes, localFwRes] = await Promise.all([
        fetch('/static/data/catalogo_manuali.json'),
        fetch('/static/data/catalogo_framework.json')
      ]);
      if (localManRes.ok) {
        const ld = await localManRes.json();
        localManuals = ld.manuals || [];
      }
      if (localFwRes.ok) {
        const fd = await localFwRes.json();
        localFrameworks = fd.frameworks || [];
      }
    } catch (e) {
      console.log('Nessun dato locale trovato, sync completa');
    }

    const localManualIds = new Map(localManuals.map(m => [m.id, m]));
    const localFrameworkIds = new Map(localFrameworks.map(f => [f.id, f]));

    // --- STEP 3: Determina cosa scaricare (incrementale) ---

    // Framework: confronta ID e modules_count
    const fwToDownload = [];
    const fwUnchanged = [];
    for (const remoteFw of remoteFrameworks) {
      const localFw = localFrameworkIds.get(remoteFw.id);
      if (localFw && localFw.syllabus_modules &&
          localFw.syllabus_modules.length === (remoteFw.modules_count || 0)) {
        // Stesso ID, stesso numero di moduli → invariato
        fwUnchanged.push(localFw);
      } else {
        // Nuovo o modificato → da scaricare
        fwToDownload.push(remoteFw);
      }
    }

    // Manuali: confronta ID e chapters_count
    // Se il manuale locale non ha chapters_summary (dato arricchito), lo riscarica
    const manToDownload = [];
    const manUnchanged = [];
    for (const remoteMan of remoteManuals) {
      const localMan = localManualIds.get(remoteMan.id);
      if (localMan && localMan.chapters_count === (remoteMan.chapters_count || 0)
          && localMan.chapters_summary) {
        // Stesso ID, stesso numero di capitoli, ha già il sommario → invariato
        manUnchanged.push(localMan);
      } else {
        // Nuovo, modificato, o manca il sommario dettagliato → da scaricare
        manToDownload.push(remoteMan);
      }
    }

    // Rimuovi quelli non più presenti su Matrix
    const remoteManualIdSet = new Set(remoteManuals.map(m => m.id));
    const remoteFrameworkIdSet = new Set(remoteFrameworks.map(f => f.id));

    const totalToDownload = fwToDownload.length + manToDownload.length;
    const totalItems = remoteManuals.length + remoteFrameworks.length;

    if (totalToDownload === 0) {
      statusEl.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-2"></i>Già aggiornato! (${remoteManuals.length} manuali, ${remoteFrameworks.length} framework)`;
      updateProgress(100, 'Nessuna modifica rilevata');
      if (detailEl) detailEl.innerHTML = formatSyncSummary(0, 0, fwUnchanged.length, manUnchanged.length, 0, 0);
      return;
    }

    statusEl.innerHTML = `<i class="fas fa-sync fa-spin mr-2"></i>Sincronizzazione: ${totalToDownload} file da aggiornare su ${totalItems} totali...`;

    // --- STEP 4: Scarica i framework individuali (quelli nuovi/modificati) ---
    const updatedFrameworks = [...fwUnchanged];
    let downloaded = 0;

    for (const fw of fwToDownload) {
      try {
        updateProgress(
          5 + Math.round((downloaded / totalToDownload) * 90),
          `Framework: ${fw.name}...`
        );

        const filepath = fw.filepath || `frameworks/${fw.filename}`;
        const url = `${MATRIX_GITHUB_BASE}/${encodeURI(filepath)}`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(`Impossibile scaricare framework ${fw.id}: HTTP ${res.status}`);
          downloaded++;
          continue;
        }

        const fullFw = await res.json();

        // Assembla nel formato Intelligence:
        // - ID dal catalogo Matrix (es. "chimica_organica_framework_completo")
        // - syllabus_modules e program_profiles da content (file individuale)
        const assembled = {
          id: fw.id,
          name: fullFw.name || fw.name,
          subject: fullFw.subject || fw.subject,
          program_profiles: (fullFw.content?.program_profiles) || fullFw.program_profiles || [],
          syllabus_modules: (fullFw.content?.syllabus_modules) || fullFw.syllabus_modules || []
        };

        updatedFrameworks.push(assembled);
        downloaded++;
      } catch (e) {
        console.error(`Errore download framework ${fw.id}:`, e);
        downloaded++;
      }

      // Piccola pausa per non sovraccaricare GitHub
      if (fwToDownload.length > 5) await sleep(200);
    }

    // --- STEP 5: Scarica i manuali individuali (quelli nuovi/modificati) ---
    const updatedManuals = [...manUnchanged];

    for (const man of manToDownload) {
      try {
        updateProgress(
          5 + Math.round((downloaded / totalToDownload) * 90),
          `Manuale: ${man.title}...`
        );

        const filepath = man.filepath || `manuali/${man.filename}`;
        const url = `${MATRIX_GITHUB_BASE}/${encodeURI(filepath)}`;
        const res = await fetch(url);

        if (!res.ok) {
          // Se il file individuale non esiste, usa i dati del catalogo
          console.warn(`File individuale non trovato per ${man.id}, uso dati catalogo`);
          updatedManuals.push(buildManualFromCatalog(man));
          downloaded++;
          continue;
        }

        const fullMan = await res.json();

        // Assembla nel formato Intelligence:
        // - ID dal catalogo Matrix
        // - chapters dal file individuale → calcola chapters_summary e temi_chiave
        const assembled = buildManualFromFull(man, fullMan);
        updatedManuals.push(assembled);
        downloaded++;
      } catch (e) {
        console.error(`Errore download manuale ${man.id}:`, e);
        // Fallback: usa dati catalogo
        updatedManuals.push(buildManualFromCatalog(man));
        downloaded++;
      }

      // Piccola pausa
      if (manToDownload.length > 10) await sleep(100);
    }

    updateProgress(98, 'Salvataggio...');

    // --- STEP 6: Costruisci i JSON finali ---

    // Calcola subjects summary per il catalogo manuali
    const subjectsSummary = {};
    for (const m of updatedManuals) {
      if (!subjectsSummary[m.subject]) {
        subjectsSummary[m.subject] = { total: 0, zanichelli: 0, competitor: 0 };
      }
      subjectsSummary[m.subject].total++;
      if (m.is_zanichelli) {
        subjectsSummary[m.subject].zanichelli++;
      } else {
        subjectsSummary[m.subject].competitor++;
      }
    }

    const finalManualsCatalog = {
      version: remoteManualsCatalog.version || '1.0.0',
      generated_for: 'MATRIX Intelligence',
      source: 'github.com/sartinisergio/matrix-analisi-programmi',
      last_synced: new Date().toISOString(),
      total_manuals: updatedManuals.length,
      subjects: subjectsSummary,
      manuals: updatedManuals
    };

    const finalFrameworkCatalog = {
      version: remoteFrameworksCatalog.version || '1.0.0',
      source: 'github.com/sartinisergio/matrix-analisi-programmi/frameworks',
      last_synced: new Date().toISOString(),
      total_frameworks: updatedFrameworks.length,
      frameworks: updatedFrameworks
    };

    // --- STEP 7: Salva in localStorage ---
    // Non possiamo scrivere file su Cloudflare Pages/Netlify a runtime,
    // quindi usiamo localStorage. I dati persistono nel browser.
    try {
      localStorage.setItem('matrix_sync_manuals', JSON.stringify(finalManualsCatalog));
      localStorage.setItem('matrix_sync_frameworks', JSON.stringify(finalFrameworkCatalog));
      localStorage.setItem('matrix_sync_timestamp', new Date().toISOString());
      console.log('Dati sincronizzati salvati in localStorage');
    } catch (storageError) {
      // localStorage pieno o non disponibile — dati comunque in memoria
      console.warn('localStorage non disponibile, dati solo in memoria:', storageError);
      showToast('Attenzione: dati sincronizzati solo in memoria (localStorage non disponibile)', 'warning');
    }

    // --- STEP 8: Aggiorna dati in memoria ---
    catalogData = finalManualsCatalog;
    catalogManuals = finalManualsCatalog.manuals;
    frameworkData = finalFrameworkCatalog;
    allFrameworks = finalFrameworkCatalog.frameworks;

    updateProgress(100, 'Completato!');

    const newFw = fwToDownload.length;
    const newMan = manToDownload.length;
    const removedFw = localFrameworks.filter(f => !remoteFrameworkIdSet.has(f.id)).length;
    const removedMan = localManuals.filter(m => !remoteManualIdSet.has(m.id)).length;

    statusEl.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-2"></i>Sincronizzazione completata!`;
    if (detailEl) detailEl.innerHTML = formatSyncSummary(newFw, newMan, fwUnchanged.length, manUnchanged.length, removedFw, removedMan);

    showToast(`Sincronizzazione completata: ${updatedFrameworks.length} framework, ${updatedManuals.length} manuali`, 'success');

    // Aggiorna selettori UI
    populateCatalogSelector();

  } catch (e) {
    console.error('Errore sincronizzazione:', e);
    statusEl.innerHTML = `<i class="fas fa-exclamation-circle text-red-500 mr-2"></i>Errore: ${e.message}`;
    showToast(`Errore sincronizzazione: ${e.message}`, 'error');
  }
}

// ===================================================
// HELPER: Costruisci manuale dal file individuale
// ===================================================

function buildManualFromFull(catalogEntry, fullData) {
  const chapters = fullData.chapters || [];
  const chaptersSummary = chapters.map(ch => {
    const num = ch.number || '';
    const title = ch.title || '';
    return `${num}: ${title}`;
  }).join('\n');

  const temiChiave = chapters.map(ch => {
    const num = ch.number || '';
    const title = ch.title || '';
    return `${num}: ${title}`;
  });

  return {
    id: catalogEntry.id,
    title: fullData.title || catalogEntry.title,
    author: fullData.author || catalogEntry.author || '',
    publisher: fullData.publisher || catalogEntry.publisher || '',
    subject: fullData.subject || catalogEntry.subject || '',
    is_zanichelli: (fullData.type === 'zanichelli') || (fullData.publisher === 'Zanichelli') ||
                   (catalogEntry.type === 'zanichelli') || (catalogEntry.publisher === 'Zanichelli'),
    chapters_count: chapters.length,
    chapters_summary: chaptersSummary,
    temi_chiave: temiChiave
  };
}

// ===================================================
// HELPER: Costruisci manuale dal catalogo (fallback)
// ===================================================

function buildManualFromCatalog(catalogEntry) {
  return {
    id: catalogEntry.id,
    title: catalogEntry.title || '',
    author: catalogEntry.author || '',
    publisher: catalogEntry.publisher || '',
    subject: catalogEntry.subject || '',
    is_zanichelli: (catalogEntry.type === 'zanichelli') || (catalogEntry.publisher === 'Zanichelli'),
    chapters_count: catalogEntry.chapters_count || 0,
    chapters_summary: '',
    temi_chiave: []
  };
}

// ===================================================
// HELPER: Progress UI
// ===================================================

function updateProgress(pct, text) {
  const bar = document.getElementById('sync-progress-bar');
  const txt = document.getElementById('sync-progress-text');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatSyncSummary(newFw, newMan, unchangedFw, unchangedMan, removedFw, removedMan) {
  let html = '<div class="mt-3 text-sm space-y-1">';

  if (newFw > 0) html += `<div class="text-green-600"><i class="fas fa-plus-circle mr-1"></i>${newFw} framework nuovi/aggiornati</div>`;
  if (newMan > 0) html += `<div class="text-green-600"><i class="fas fa-plus-circle mr-1"></i>${newMan} manuali nuovi/aggiornati</div>`;
  if (unchangedFw > 0) html += `<div class="text-gray-500"><i class="fas fa-check mr-1"></i>${unchangedFw} framework invariati</div>`;
  if (unchangedMan > 0) html += `<div class="text-gray-500"><i class="fas fa-check mr-1"></i>${unchangedMan} manuali invariati</div>`;
  // Mostra "rimossi" solo se NON è una prima sincronizzazione completa
  // (cioè se c'erano anche elementi invariati — altrimenti è solo un cambio di ID)
  if (removedFw > 0 && unchangedFw > 0) html += `<div class="text-orange-500"><i class="fas fa-minus-circle mr-1"></i>${removedFw} framework non più presenti in Matrix</div>`;
  if (removedMan > 0 && unchangedMan > 0) html += `<div class="text-orange-500"><i class="fas fa-minus-circle mr-1"></i>${removedMan} manuali non più presenti in Matrix</div>`;

  html += '</div>';
  return html;
}
