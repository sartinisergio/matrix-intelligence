// ==========================================
// MATRIX Intelligence — Monitoraggio Disciplinare
// ==========================================
// Sezione indipendente da campagna.js.
// Gestisce il flusso: materia + volumi → analisi strategica per docente.
// Fase 1: CRUD, form, rendering statico.
// Fase 2: generaTargetMonitoraggio, LLM calls, refresh, email.

let allMonitoraggi = [];
let currentMonTargets = [];
let currentMonitoraggioId = null;
let monitoraggioGenerating = false; // Flag anti-doppio click

// ===================================================
// CARICAMENTO E LISTA
// ===================================================

async function loadMonitoraggi() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  // Carica risorse condivise (catalogo + framework) se non gia caricate
  loadCatalog();
  loadFrameworks();

  try {
    const { data, error } = await supabaseClient
      .from('campagne')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('tipo', 'monitoraggio')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allMonitoraggi = data || [];
    renderMonitoraggiList();
  } catch (e) {
    showToast('Errore caricamento monitoraggi: ' + e.message, 'error');
  }
}

function renderMonitoraggiList() {
  const container = document.getElementById('monitoraggi-list');

  if (allMonitoraggi.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <i class="fas fa-binoculars text-4xl mb-3 block"></i>
        <p>Nessun monitoraggio creato</p>
        <p class="text-sm mt-1">Crea il tuo primo monitoraggio disciplinare per analizzare una materia</p>
      </div>`;
    return;
  }

  container.innerHTML = allMonitoraggi.map(m => {
    const volumi = m.volumi_monitoraggio || [];
    const volumiCount = volumi.length;
    const targetCount = (m.target_generati || []).length;
    const materia = m.libro_materia || 'Materia non specificata';

    // Badge stato
    let statusBadge;
    if (m.stato === 'completata' && targetCount > 0) {
      statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><i class="fas fa-check-circle mr-1"></i>Completato</span>';
    } else if (targetCount > 0) {
      statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><i class="fas fa-spinner mr-1"></i>In elaborazione</span>';
    } else {
      statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><i class="fas fa-edit mr-1"></i>Bozza</span>';
    }

    // Titoli dei volumi
    const volumiLabels = volumi.map(v => v.titolo).filter(Boolean).join(', ');

    // Bottoni azioni
    let actionButtons = '';
    if (targetCount > 0) {
      actionButtons += `
        <button onclick="viewMonitoraggioTargets('${m.id}')" class="px-3 py-1.5 bg-zanichelli-accent text-zanichelli-blue rounded-lg text-sm hover:bg-blue-100 transition-colors" title="Vedi risultati">
          <i class="fas fa-list mr-1"></i>Risultati
        </button>`;
    }
    if (m.stato === 'bozza' || (m.stato !== 'completata' && targetCount === 0)) {
      actionButtons += `
        <button onclick="generaTargetMonitoraggio('${m.id}')" class="px-3 py-1.5 bg-zanichelli-blue text-white rounded-lg text-sm hover:bg-zanichelli-dark transition-colors" title="Avvia analisi disciplinare">
          <i class="fas fa-play mr-1"></i>Genera analisi
        </button>`;
    } else if (m.stato === 'completata') {
      actionButtons += `
        <button onclick="generaTargetMonitoraggio('${m.id}')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors" title="Rigenera analisi completa">
          <i class="fas fa-redo mr-1"></i>Rigenera
        </button>`;
    }

    return `
      <div class="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-1">
              <h3 class="font-semibold text-gray-800">
                <i class="fas fa-binoculars text-zanichelli-light mr-1.5 text-sm"></i>
                ${materia}
              </h3>
              ${statusBadge}
            </div>
            <p class="text-sm text-gray-500">${volumiLabels || 'Nessun volume inserito'}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span><i class="fas fa-book mr-1"></i>${volumiCount} volum${volumiCount === 1 ? 'e' : 'i'}</span>
              <span><i class="fas fa-users mr-1"></i>${targetCount} docent${targetCount === 1 ? 'e' : 'i'}</span>
              <span><i class="fas fa-clock mr-1"></i>${formatDate(m.created_at)}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            ${actionButtons}
            <button onclick="deleteMonitoraggio('${m.id}')" class="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-sm hover:bg-red-100 transition-colors" title="Elimina monitoraggio">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===================================================
// FORM: MOSTRA / NASCONDI / GESTIONE VOLUMI
// ===================================================

function showNewMonitoraggioForm() {
  document.getElementById('monitoraggio-form-container').classList.remove('hidden');
  document.getElementById('btn-new-monitoraggio').classList.add('hidden');
  document.getElementById('monitoraggi-list').classList.add('hidden');

  // Reset form
  document.getElementById('mon-materia').value = '';
  resetMonitoraggioVolumi();
  validateMonitoraggioForm();
}

function hideMonitoraggioForm() {
  document.getElementById('monitoraggio-form-container').classList.add('hidden');
  document.getElementById('btn-new-monitoraggio').classList.remove('hidden');
  document.getElementById('monitoraggi-list').classList.remove('hidden');
}

function resetMonitoraggioVolumi() {
  const container = document.getElementById('mon-volumi-container');
  // Ricrea solo il primo volume
  container.innerHTML = createVolumeEntryHTML(0);
  document.getElementById('btn-add-volume').classList.remove('hidden');
  document.getElementById('mon-volume-limit-msg').classList.add('hidden');
  updateVolumiCount();
}

function createVolumeEntryHTML(index) {
  const removeBtn = index > 0
    ? `<button type="button" onclick="removeMonitoraggioVolume(this)" class="text-xs text-red-400 hover:text-red-600 transition-colors">
         <i class="fas fa-trash-alt mr-1"></i>Rimuovi
       </button>`
    : '';

  return `
    <div class="mon-volume-entry bg-gray-50 rounded-xl p-4 border border-gray-200" data-volume-index="${index}">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-gray-700">
          <i class="fas fa-book text-zanichelli-light mr-1"></i>Volume ${index + 1}
        </span>
        ${removeBtn}
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Titolo del volume *</label>
          <input type="text" class="mon-vol-titolo w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                 placeholder="Es: Chimica Generale e Inorganica — Petrucci"
                 oninput="validateMonitoraggioForm()">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Indice / Sommario dei capitoli *</label>
          <textarea class="mon-vol-indice w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" rows="4"
                    placeholder="Incolla qui l'indice del volume (capitoli principali). Necessario per l'analisi di allineamento."
                    oninput="validateMonitoraggioForm()"></textarea>
        </div>
      </div>
    </div>`;
}

function addMonitoraggioVolume() {
  const container = document.getElementById('mon-volumi-container');
  const entries = container.querySelectorAll('.mon-volume-entry');

  if (entries.length >= 5) return; // Hard limit

  const newIndex = entries.length;
  const div = document.createElement('div');
  div.innerHTML = createVolumeEntryHTML(newIndex);
  container.appendChild(div.firstElementChild);

  updateVolumiCount();
  validateMonitoraggioForm();

  // Se raggiunto il limite, nascondi il bottone e mostra il messaggio
  if (container.querySelectorAll('.mon-volume-entry').length >= 5) {
    document.getElementById('btn-add-volume').classList.add('hidden');
    document.getElementById('mon-volume-limit-msg').classList.remove('hidden');
  }
}

function removeMonitoraggioVolume(btn) {
  const entry = btn.closest('.mon-volume-entry');
  entry.remove();

  // Rinumera le entry rimaste
  const container = document.getElementById('mon-volumi-container');
  const entries = container.querySelectorAll('.mon-volume-entry');
  entries.forEach((el, i) => {
    el.dataset.volumeIndex = i;
    el.querySelector('.text-sm.font-semibold').innerHTML =
      `<i class="fas fa-book text-zanichelli-light mr-1"></i>Volume ${i + 1}`;
  });

  // Riabilita bottone aggiungi se sotto il limite
  if (entries.length < 5) {
    document.getElementById('btn-add-volume').classList.remove('hidden');
    document.getElementById('mon-volume-limit-msg').classList.add('hidden');
  }

  updateVolumiCount();
  validateMonitoraggioForm();
}

function updateVolumiCount() {
  const count = document.querySelectorAll('.mon-volume-entry').length;
  const label = document.getElementById('mon-volumi-count');
  if (label) label.textContent = `${count} di 5`;
}

function validateMonitoraggioForm() {
  const materia = document.getElementById('mon-materia')?.value.trim();
  const entries = document.querySelectorAll('.mon-volume-entry');
  const btn = document.getElementById('btn-avvia-monitoraggio');
  if (!btn) return;

  // Almeno un volume con titolo e indice compilati
  let hasValidVolume = false;
  entries.forEach(entry => {
    const titolo = entry.querySelector('.mon-vol-titolo')?.value.trim();
    const indice = entry.querySelector('.mon-vol-indice')?.value.trim();
    if (titolo && indice) hasValidVolume = true;
  });

  const isValid = materia && hasValidVolume;
  btn.disabled = !isValid;
}

// ===================================================
// CREAZIONE MONITORAGGIO
// ===================================================

async function handleCreateMonitoraggio(event) {
  event.preventDefault();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('Sessione scaduta, effettua il login', 'error');
    return;
  }

  const materia = document.getElementById('mon-materia').value.trim();
  if (!materia) {
    showToast('Inserisci la materia da monitorare', 'warning');
    return;
  }

  // Raccogli volumi
  const entries = document.querySelectorAll('.mon-volume-entry');
  const volumi = [];
  entries.forEach(entry => {
    const titolo = entry.querySelector('.mon-vol-titolo')?.value.trim();
    const indice = entry.querySelector('.mon-vol-indice')?.value.trim();
    if (titolo && indice) {
      volumi.push({
        titolo: titolo,
        materia: materia,
        indice: indice,
        temi: [] // Saranno popolati via LLM nella Fase 2
      });
    }
  });

  if (volumi.length === 0) {
    showToast('Inserisci almeno un volume con titolo e indice', 'warning');
    return;
  }

  if (volumi.length > 5) {
    showToast('Massimo 5 volumi consentiti', 'warning');
    return;
  }

  // Costruisci il record
  const monitoraggio = {
    user_id: session.user.id,
    tipo: 'monitoraggio',
    libro_titolo: `Monitoraggio: ${materia}`,
    libro_materia: materia,
    libro_editore: 'Zanichelli',
    volumi_monitoraggio: volumi,
    stato: 'bozza'
  };

  try {
    const { data, error } = await supabaseClient
      .from('campagne')
      .insert(monitoraggio)
      .select()
      .single();

    if (error) throw error;

    showToast(`Monitoraggio "${materia}" creato con ${volumi.length} volum${volumi.length === 1 ? 'e' : 'i'}!`, 'success');
    hideMonitoraggioForm();
    await loadMonitoraggi();

    // Avvia la generazione target
    await generaTargetMonitoraggio(data.id);

  } catch (e) {
    showToast('Errore creazione monitoraggio: ' + e.message, 'error');
    console.error('[Monitoraggio] Errore creazione:', e);
  }
}

// ===================================================
// ELIMINAZIONE
// ===================================================

async function deleteMonitoraggio(id) {
  if (!confirm('Eliminare questo monitoraggio? L\'operazione non e reversibile.')) return;

  try {
    const { error } = await supabaseClient
      .from('campagne')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Monitoraggio eliminato', 'success');
    // Se era quello aperto, chiudi i risultati
    if (currentMonitoraggioId === id) {
      closeMonitoraggioResults();
    }
    await loadMonitoraggi();
  } catch (e) {
    showToast('Errore eliminazione: ' + e.message, 'error');
  }
}

// ===================================================
// VISUALIZZAZIONE TARGET
// ===================================================

function viewMonitoraggioTargets(monitoraggioId) {
  const mon = allMonitoraggi.find(m => m.id === monitoraggioId);
  if (!mon) return;

  currentMonTargets = mon.target_generati || [];
  currentMonitoraggioId = monitoraggioId;

  // Titolo
  document.getElementById('mon-result-title').textContent = mon.libro_materia || 'Monitoraggio';

  // Nascondi la colonna "Volume consigliato" se c'e un solo volume
  const volumi = mon.volumi_monitoraggio || [];
  const colVolume = document.getElementById('mon-col-volume');
  if (colVolume) {
    colVolume.style.display = volumi.length > 1 ? '' : 'none';
  }

  // Mostra il container risultati
  document.getElementById('monitoraggio-results-container').classList.remove('hidden');
  document.getElementById('monitoraggi-list').classList.add('hidden');
  document.getElementById('btn-new-monitoraggio').classList.add('hidden');

  // Render sintesi
  renderMonitoraggioSintesi(mon.sintesi_disciplina);

  // Render target
  renderMonitoraggioTargets(currentMonTargets, volumi.length > 1);
}

function closeMonitoraggioResults() {
  document.getElementById('monitoraggio-results-container').classList.add('hidden');
  document.getElementById('monitoraggi-list').classList.remove('hidden');
  document.getElementById('btn-new-monitoraggio').classList.remove('hidden');
  currentMonitoraggioId = null;
  currentMonTargets = [];
}

// ===================================================
// RENDERING: SINTESI DISCIPLINARE
// ===================================================

function renderMonitoraggioSintesi(sintesi) {
  const panel = document.getElementById('mon-sintesi-panel');
  if (!sintesi) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  document.getElementById('mon-stat-totale').textContent = sintesi.totale_docenti || 0;
  document.getElementById('mon-stat-difese').textContent = sintesi.difese_urgenti || 0;
  document.getElementById('mon-stat-upgrade').textContent = sintesi.upgrade_possibili || 0;
  document.getElementById('mon-stat-conquiste').textContent = sintesi.conquiste_possibili || 0;
  document.getElementById('mon-stat-nonvalutati').textContent = sintesi.non_valutati || 0;

  const notaEl = document.getElementById('mon-nota-strategica');
  if (sintesi.nota_strategica) {
    notaEl.innerHTML = `<i class="fas fa-lightbulb mr-1"></i>${sintesi.nota_strategica}`;
    notaEl.classList.remove('hidden');
  } else {
    notaEl.classList.add('hidden');
  }
}

// ===================================================
// RENDERING: TABELLA TARGET MONITORAGGIO
// ===================================================

function monitoraggioAzioneBadge(tipo) {
  const map = {
    'DIFESA': { label: 'Difesa', class: 'bg-red-100 text-red-700', icon: 'fa-shield-alt' },
    'UPGRADE': { label: 'Upgrade', class: 'bg-orange-100 text-orange-700', icon: 'fa-arrow-up' },
    'CONQUISTA': { label: 'Conquista', class: 'bg-green-100 text-green-700', icon: 'fa-flag' },
    'DA VERIFICARE': { label: 'Da verificare', class: 'bg-gray-100 text-gray-500', icon: 'fa-question-circle' }
  };
  const a = map[tipo] || { label: tipo || '—', class: 'bg-gray-100 text-gray-500', icon: 'fa-question-circle' };
  return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${a.class}">
    <i class="fas ${a.icon} text-[10px]"></i>${a.label}
  </span>`;
}

function monitoraggioUrgenzaBadge(urgenza) {
  const map = {
    'ALTA': { label: 'Alta', class: 'bg-red-100 text-red-800' },
    'MEDIA': { label: 'Media', class: 'bg-orange-100 text-orange-700' },
    'BASSA': { label: 'Bassa', class: 'bg-gray-100 text-gray-500' }
  };
  const u = map[urgenza] || { label: urgenza || '—', class: 'bg-gray-100 text-gray-500' };
  return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.class}">${u.label}</span>`;
}

function renderMonitoraggioTargets(targets, showVolumeColumn) {
  const tbody = document.getElementById('mon-target-table-body');

  if (!targets || targets.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9" class="px-4 py-8 text-center text-gray-400">
        <i class="fas fa-binoculars text-3xl mb-2 block"></i>
        Nessun target generato — premi "Genera analisi" dalla lista monitoraggi
      </td></tr>`;
    return;
  }

  tbody.innerHTML = targets.map((t, i) => {
    // Colore riga basato su urgenza
    const rowBg = t.urgenza === 'ALTA' ? 'bg-red-50/30' : t.urgenza === 'MEDIA' ? 'bg-orange-50/20' : '';

    // Colonna volume (visibile solo se multi-volume)
    const volumeCell = showVolumeColumn
      ? `<td class="px-4 py-3 text-sm text-gray-600">${truncate(t.volume_consigliato || '—', 35)}</td>`
      : `<td class="px-4 py-3 text-sm text-gray-600" style="display:none">${t.volume_consigliato || '—'}</td>`;

    // Pulsante email disabilitato per DA VERIFICARE
    const isVerificare = t.tipo_azione === 'DA VERIFICARE';
    const emailBtn = isVerificare
      ? `<button disabled class="px-3 py-1.5 bg-gray-200 text-gray-400 rounded-lg text-xs cursor-not-allowed whitespace-nowrap" title="Completa l'analisi prima di generare la mail">
           <i class="fas fa-envelope mr-1"></i>Mail
         </button>`
      : `<button onclick="generateMonitoraggioEmail(${i})" class="px-3 py-1.5 bg-zanichelli-blue text-white rounded-lg text-xs hover:bg-zanichelli-dark transition-colors whitespace-nowrap" title="Genera mail personalizzata">
           <i class="fas fa-envelope mr-1"></i>Mail
         </button>`;

    return `
      <tr class="border-t ${rowBg}">
        <td class="px-4 py-3 text-gray-500 text-xs">${i + 1}</td>
        <td class="px-4 py-3">
          <div class="font-medium text-gray-800">${t.docente_nome || '—'}</div>
          ${t.docente_email ? `<div class="text-xs text-gray-400">${t.docente_email}</div>` : ''}
        </td>
        <td class="px-4 py-3 text-gray-600 text-sm">
          ${t.ateneo || '—'}
          ${t.classe_laurea ? `<div class="text-xs text-gray-400">${t.classe_laurea}</div>` : ''}
        </td>
        <td class="px-4 py-3">${scenarioBadge(t.scenario)}</td>
        ${volumeCell}
        <td class="px-4 py-3">${monitoraggioAzioneBadge(t.tipo_azione)}</td>
        <td class="px-4 py-3">${monitoraggioUrgenzaBadge(t.urgenza)}</td>
        <td class="px-4 py-3 text-sm text-gray-600 max-w-xs">
          ${t.motivazione_scelta ? truncate(t.motivazione_scelta, 100) : '<span class="text-gray-400 italic">In attesa di analisi</span>'}
        </td>
        <td class="px-4 py-3 text-center">
          <div class="flex flex-col gap-1.5 items-center">
            <button onclick="refreshMonitoraggioDocente(${i})" 
                    class="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 transition-colors whitespace-nowrap"
                    title="Rigenera l'analisi per questo docente">
              <i class="fas fa-sync-alt"></i>
            </button>
            ${emailBtn}
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ===================================================
// CONCURRENCY LIMITER (inline p-limit replacement)
// ===================================================

function createConcurrencyLimiter(concurrency) {
  let active = 0;
  const queue = [];

  function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  }

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

// ===================================================
// GENERAZIONE TARGET MONITORAGGIO (ORCHESTRAZIONE)
// ===================================================

function updateMonProgress(current, total, detail) {
  const container = document.getElementById('monitoraggio-progress');
  const bar = document.getElementById('mon-progress-bar');
  const text = document.getElementById('mon-progress-text');
  const detailEl = document.getElementById('mon-progress-detail');

  if (!container) return;
  container.classList.remove('hidden');
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  if (bar) bar.style.width = pct + '%';
  if (text) text.textContent = `${current}/${total}`;
  if (detailEl && detail) detailEl.textContent = detail;
}

function hideMonProgress() {
  const container = document.getElementById('monitoraggio-progress');
  if (container) container.classList.add('hidden');
}

async function generaTargetMonitoraggio(monitoraggioId) {
  if (monitoraggioGenerating) {
    showToast('Generazione gia in corso, attendere...', 'warning');
    return;
  }
  monitoraggioGenerating = true;

  const mon = allMonitoraggi.find(m => m.id === monitoraggioId);
  if (!mon) {
    showToast('Monitoraggio non trovato', 'error');
    monitoraggioGenerating = false;
    return;
  }

  const materia = mon.libro_materia;
  const volumi = mon.volumi_monitoraggio || [];
  if (volumi.length === 0) {
    showToast('Nessun volume configurato nel monitoraggio', 'warning');
    monitoraggioGenerating = false;
    return;
  }

  // Verifica API key
  if (!CONFIG.OPENAI_API_KEY) {
    showToast('API Key OpenAI non configurata. Vai nelle Impostazioni.', 'error');
    monitoraggioGenerating = false;
    return;
  }

  try {
    showToast(`Avvio analisi disciplinare per "${materia}"...`, 'info');
    updateMonProgress(0, 1, 'Caricamento risorse...');

    // 1. Carica risorse condivise
    await loadCatalog();
    await loadFrameworks();
    const framework = findFrameworkForSubject(materia);

    // 2. Carica programmi dell'utente
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Sessione scaduta');

    const { data: programs, error: progErr } = await supabaseClient
      .from('programmi')
      .select('*')
      .eq('user_id', session.user.id);

    if (progErr) throw progErr;
    if (!programs || programs.length === 0) {
      showToast('Nessun programma nel database. Carica prima dei PDF dalla sezione Upload.', 'warning');
      monitoraggioGenerating = false;
      hideMonProgress();
      return;
    }

    // 3. Filtra docenti per materia
    const matchingPrograms = programs.filter(p =>
      checkSubjectMatch(materia, p.materia_inferita)
    );

    if (matchingPrograms.length === 0) {
      showToast(`Nessun programma corrisponde alla materia "${materia}". Verifica i programmi caricati.`, 'warning');
      monitoraggioGenerating = false;
      hideMonProgress();
      return;
    }

    console.log(`[Monitoraggio] ${matchingPrograms.length} programmi trovati per "${materia}"`);
    updateMonProgress(0, matchingPrograms.length, `Analisi di ${matchingPrograms.length} docenti...`);

    // 4. Estrai temi dai volumi se mancanti (una sola volta)
    for (let vi = 0; vi < volumi.length; vi++) {
      const v = volumi[vi];
      if ((!v.temi || v.temi.length === 0) && v.indice && v.indice.trim().length > 20) {
        try {
          const themeResult = await callOpenAI(
            'Estrai 10-15 temi/argomenti chiave dal seguente indice di un libro accademico. Rispondi con JSON: {"temi": ["tema1", "tema2", ...]}',
            v.indice, true
          );
          volumi[vi].temi = themeResult.temi || [];
          console.log(`[Monitoraggio] Temi estratti per "${v.titolo}": ${volumi[vi].temi.length}`);
        } catch (e) {
          console.warn(`[Monitoraggio] Errore estrazione temi volume ${v.titolo}:`, e);
          volumi[vi].temi = [];
        }
      }
    }
    // Salva volumi con temi aggiornati
    await supabaseClient.from('campagne').update({ volumi_monitoraggio: volumi }).eq('id', monitoraggioId);

    // 5. Analisi parallela con concurrency limiter (max 3)
    const limit = createConcurrencyLimiter(3);
    let completed = 0;
    const results = [];

    const promises = matchingPrograms.map(prog =>
      limit(async () => {
        try {
          const result = await generaMatchingMultiVolume(prog, volumi, framework);
          completed++;
          updateMonProgress(completed, matchingPrograms.length, `Analizzato: ${prog.docente_nome || 'Docente ' + completed}`);
          return {
            programma_id: prog.id,
            docente_nome: prog.docente_nome || '',
            docente_email: prog.docente_email || '',
            ateneo: prog.ateneo || '',
            classe_laurea: prog.classe_laurea || '',
            materia_inferita: prog.materia_inferita || '',
            scenario: prog.scenario_zanichelli || 'Non classificato',
            scenario_zanichelli: prog.scenario_zanichelli || 'Non classificato',
            manuale_principale: (prog.manuali_citati || []).find(m => m.ruolo === 'principale')?.titolo || '',
            volume_ottimale: result.volume_ottimale || '',
            volume_consigliato: result.volume_ottimale || '',
            motivazione_scelta: result.motivazione_scelta || '',
            allineamento: (result.valutazioni || []).find(v => v.titolo === result.volume_ottimale)?.allineamento || 'medio',
            valutazioni_volumi: result.valutazioni || [],
            stato_analisi: 'completato'
          };
        } catch (e) {
          completed++;
          updateMonProgress(completed, matchingPrograms.length, `Errore per: ${prog.docente_nome || 'Docente'}`);
          console.error(`[Monitoraggio] Errore analisi ${prog.docente_nome}:`, e);
          return {
            programma_id: prog.id,
            docente_nome: prog.docente_nome || '',
            docente_email: prog.docente_email || '',
            ateneo: prog.ateneo || '',
            classe_laurea: prog.classe_laurea || '',
            materia_inferita: prog.materia_inferita || '',
            scenario: prog.scenario_zanichelli || 'Non classificato',
            scenario_zanichelli: prog.scenario_zanichelli || 'Non classificato',
            manuale_principale: (prog.manuali_citati || []).find(m => m.ruolo === 'principale')?.titolo || '',
            volume_ottimale: '',
            volume_consigliato: '',
            motivazione_scelta: '',
            allineamento: 'non_valutato',
            valutazioni_volumi: [],
            tipo_azione: 'DA VERIFICARE',
            urgenza: 'BASSA',
            stato_analisi: 'errore',
            errore: e.message
          };
        }
      })
    );

    const allResults = await Promise.all(promises);
    console.log(`[Monitoraggio] Analisi completata: ${allResults.length} docenti`);

    // 6. Prioritizzazione via LLM
    updateMonProgress(matchingPrograms.length, matchingPrograms.length, 'Generazione priorita disciplinare...');

    let prioritaData = null;
    try {
      prioritaData = await generaPrioritaMonitoraggio(allResults, materia);
    } catch (e) {
      console.error('[Monitoraggio] Errore prioritizzazione:', e);
      showToast('Errore nella prioritizzazione — i risultati saranno mostrati senza ordinamento', 'warning');
    }

    // 7. Merge priorita con risultati
    let targets;
    if (prioritaData && prioritaData.lista_priorita) {
      targets = prioritaData.lista_priorita.map(p => {
        // Cerca il risultato corrispondente
        const match = allResults.find(r =>
          r.docente_nome && p.docente &&
          r.docente_nome.toLowerCase().includes(p.docente.toLowerCase().split(' ')[0])
        ) || allResults.find(r => r.ateneo && p.ateneo && r.ateneo.toLowerCase() === p.ateneo.toLowerCase());

        return {
          ...(match || {}),
          docente_nome: p.docente || match?.docente_nome || '',
          ateneo: p.ateneo || match?.ateneo || '',
          tipo_azione: p.tipo_azione || 'DA VERIFICARE',
          urgenza: p.urgenza || 'BASSA',
          volume_consigliato: p.volume_consigliato || match?.volume_consigliato || '',
          motivazione_scelta: p.motivazione || match?.motivazione_scelta || '',
          scenario: p.scenario_attuale || match?.scenario || 'Non classificato'
        };
      });

      // Aggiungi eventuali risultati non inclusi nella lista priorita
      for (const r of allResults) {
        const found = targets.some(t =>
          t.docente_nome && r.docente_nome &&
          t.docente_nome.toLowerCase() === r.docente_nome.toLowerCase()
        );
        if (!found) {
          targets.push({
            ...r,
            tipo_azione: 'DA VERIFICARE',
            urgenza: 'BASSA'
          });
        }
      }
    } else {
      // Fallback senza prioritizzazione: ordine per scenario
      targets = allResults.map(r => ({
        ...r,
        tipo_azione: r.tipo_azione || mapScenarioToAzione(r.scenario, r.allineamento),
        urgenza: r.urgenza || mapScenarioToUrgenza(r.scenario, r.allineamento)
      }));
    }

    // 8. Salva tutto in Supabase
    const sintesi = prioritaData?.sintesi_disciplina || {
      totale_docenti: targets.length,
      difese_urgenti: targets.filter(t => t.tipo_azione === 'DIFESA').length,
      upgrade_possibili: targets.filter(t => t.tipo_azione === 'UPGRADE').length,
      conquiste_possibili: targets.filter(t => t.tipo_azione === 'CONQUISTA').length,
      non_valutati: targets.filter(t => t.tipo_azione === 'DA VERIFICARE').length,
      nota_strategica: ''
    };

    const { error: saveErr } = await supabaseClient
      .from('campagne')
      .update({
        target_generati: targets,
        sintesi_disciplina: sintesi,
        volumi_monitoraggio: volumi,
        stato: 'completata',
        updated_at: new Date().toISOString()
      })
      .eq('id', monitoraggioId);

    if (saveErr) throw saveErr;

    // 9. Aggiorna UI
    hideMonProgress();
    showToast(`Analisi completata: ${targets.length} docenti analizzati per "${materia}"`, 'success');
    await loadMonitoraggi();

    // Apri direttamente i risultati
    viewMonitoraggioTargets(monitoraggioId);

  } catch (e) {
    console.error('[Monitoraggio] Errore generazione:', e);
    showToast('Errore generazione monitoraggio: ' + e.message, 'error');
    hideMonProgress();
  } finally {
    monitoraggioGenerating = false;
  }
}

// --- Fallback mapping scenario → azione/urgenza ---
function mapScenarioToAzione(scenario, allineamento) {
  const s = (scenario || '').toLowerCase();
  if (s.includes('principale')) return 'DIFESA';
  if (s.includes('alternativo')) return 'UPGRADE';
  if (s.includes('assente')) return 'CONQUISTA';
  return 'DA VERIFICARE';
}

function mapScenarioToUrgenza(scenario, allineamento) {
  const s = (scenario || '').toLowerCase();
  const a = (allineamento || '').toLowerCase();
  if (s.includes('principale') && (a === 'medio' || a === 'basso')) return 'ALTA';
  if (s.includes('alternativo') && a === 'alto') return 'ALTA';
  if (s.includes('assente') && a === 'alto') return 'MEDIA';
  if (s.includes('principale') && a === 'alto') return 'MEDIA';
  if (s.includes('alternativo') && a === 'medio') return 'MEDIA';
  return 'BASSA';
}

// ===================================================
// REFRESH SINGOLO DOCENTE
// ===================================================

async function refreshMonitoraggioDocente(targetIndex) {
  const mon = allMonitoraggi.find(m => m.id === currentMonitoraggioId);
  if (!mon) { showToast('Monitoraggio non trovato', 'error'); return; }

  const target = currentMonTargets[targetIndex];
  if (!target) { showToast('Target non trovato', 'error'); return; }

  if (!CONFIG.OPENAI_API_KEY) {
    showToast('API Key OpenAI non configurata', 'error');
    return;
  }

  // Mostra spinner sul bottone
  const btn = document.querySelector(`#mon-target-table-body tr:nth-child(${targetIndex + 1}) .fa-sync-alt`);
  if (btn) btn.classList.add('fa-spin');

  try {
    // Recupera programma fresco dal DB
    const { data: prog, error } = await supabaseClient
      .from('programmi')
      .select('*')
      .eq('id', target.programma_id)
      .single();

    if (error || !prog) throw new Error('Programma non trovato nel database');

    const volumi = mon.volumi_monitoraggio || [];
    await loadFrameworks();
    const framework = findFrameworkForSubject(mon.libro_materia);

    // Riesegui matching
    const result = await generaMatchingMultiVolume(prog, volumi, framework);

    // Aggiorna il target
    currentMonTargets[targetIndex] = {
      ...target,
      volume_ottimale: result.volume_ottimale || '',
      volume_consigliato: result.volume_ottimale || '',
      motivazione_scelta: result.motivazione_scelta || '',
      allineamento: (result.valutazioni || []).find(v => v.titolo === result.volume_ottimale)?.allineamento || 'medio',
      valutazioni_volumi: result.valutazioni || [],
      tipo_azione: mapScenarioToAzione(target.scenario, (result.valutazioni || []).find(v => v.titolo === result.volume_ottimale)?.allineamento || 'medio'),
      urgenza: mapScenarioToUrgenza(target.scenario, (result.valutazioni || []).find(v => v.titolo === result.volume_ottimale)?.allineamento || 'medio'),
      stato_analisi: 'completato',
      errore: undefined
    };

    // Salva in Supabase
    await supabaseClient
      .from('campagne')
      .update({
        target_generati: currentMonTargets,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentMonitoraggioId);

    // Aggiorna in-memory e UI
    const monIdx = allMonitoraggi.findIndex(m => m.id === currentMonitoraggioId);
    if (monIdx >= 0) allMonitoraggi[monIdx].target_generati = currentMonTargets;

    const showVol = (mon.volumi_monitoraggio || []).length > 1;
    renderMonitoraggioTargets(currentMonTargets, showVol);

    showToast(`Analisi aggiornata per ${target.docente_nome || 'docente'}`, 'success');

  } catch (e) {
    console.error('[Monitoraggio] Errore refresh docente:', e);
    showToast('Errore rigenerazione: ' + e.message, 'error');
  } finally {
    if (btn) btn.classList.remove('fa-spin');
  }
}

// ===================================================
// GENERAZIONE EMAIL
// ===================================================

async function generateMonitoraggioEmail(targetIndex) {
  const mon = allMonitoraggi.find(m => m.id === currentMonitoraggioId);
  if (!mon) { showToast('Monitoraggio non trovato', 'error'); return; }

  const target = currentMonTargets[targetIndex];
  if (!target) { showToast('Target non trovato', 'error'); return; }

  if (target.tipo_azione === 'DA VERIFICARE') {
    showToast('Completa prima l\'analisi per questo docente (premi Rigenera)', 'warning');
    return;
  }

  if (!CONFIG.OPENAI_API_KEY) {
    showToast('API Key OpenAI non configurata', 'error');
    return;
  }

  showToast('Generazione email in corso...', 'info');

  try {
    // Trova il volume ottimale tra i volumi configurati
    const volumi = mon.volumi_monitoraggio || [];
    const volumeOttimale = volumi.find(v => v.titolo === target.volume_consigliato) || volumi[0] || {};

    const userPrompt = `Scrivi una email professionale per un promotore editoriale Zanichelli.

DESTINATARIO:
- Docente: ${target.docente_nome || 'N/D'}
- Ateneo: ${target.ateneo || 'N/D'}
- Materia: ${target.materia_inferita || mon.libro_materia || 'N/D'}
- Scenario attuale: ${target.scenario || 'N/D'}

AZIONE: ${target.tipo_azione || 'N/D'}
VOLUME DA PROPORRE: ${volumeOttimale.titolo || target.volume_consigliato || 'N/D'}
MOTIVAZIONE: ${target.motivazione_scelta || 'N/D'}

Scrivi una email breve (max 150 parole), professionale, che:
1. Si presenti come promotore Zanichelli
2. Faccia riferimento alla materia e all'ateneo
3. Proponga il volume specifico con 1-2 punti di forza concreti legati al programma del docente
4. Chieda un appuntamento

Tono: cordiale, professionale, non invasivo. NO frasi generiche. NO elenchi puntati.`;

    const systemPrompt = 'Sei un esperto di comunicazione commerciale nel settore editoriale universitario. Scrivi email concise, personalizzate e professionali. Rispondi SOLO con il testo della email, senza commenti.';

    const emailText = await callOpenAIExtended(systemPrompt, userPrompt, false, 1000);

    // Mostra email in modal o alert (riusa pattern di campagna se disponibile)
    showEmailModal(target, emailText);

  } catch (e) {
    console.error('[Monitoraggio] Errore generazione email:', e);
    showToast('Errore generazione email: ' + e.message, 'error');
  }
}

function showEmailModal(target, emailText) {
  // Controlla se esiste un modal generico oppure ne crea uno semplice
  let modal = document.getElementById('mon-email-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mon-email-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-envelope text-zanichelli-light mr-2"></i>Email per ${target.docente_nome || 'Docente'}
          </h3>
          <button onclick="document.getElementById('mon-email-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-1">${target.ateneo || ''} — ${target.volume_consigliato || ''}</p>
      </div>
      <div class="p-6">
        <pre class="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">${emailText}</pre>
      </div>
      <div class="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
        <button onclick="navigator.clipboard.writeText(document.querySelector('#mon-email-modal pre').textContent).then(() => showToast('Email copiata!', 'success'))" class="px-4 py-2 bg-zanichelli-blue text-white rounded-lg text-sm hover:bg-zanichelli-dark transition-colors">
          <i class="fas fa-copy mr-1"></i>Copia
        </button>
        <button onclick="document.getElementById('mon-email-modal').classList.add('hidden')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">
          Chiudi
        </button>
      </div>
    </div>`;

  modal.classList.remove('hidden');
}

// ===================================================
// EXPORT CSV
// ===================================================

function exportMonitoraggioCSV() {
  if (!currentMonTargets || currentMonTargets.length === 0) {
    showToast('Nessun dato da esportare', 'warning');
    return;
  }

  const mon = allMonitoraggi.find(m => m.id === currentMonitoraggioId);
  const materia = mon?.libro_materia || 'monitoraggio';
  const volumi = mon?.volumi_monitoraggio || [];
  const showVolume = volumi.length > 1;

  // Header
  let headers = ['#', 'Docente', 'Email', 'Ateneo', 'Classe', 'Scenario'];
  if (showVolume) headers.push('Volume consigliato');
  headers.push('Azione', 'Urgenza', 'Motivazione');

  // Righe
  const rows = currentMonTargets.map((t, i) => {
    let row = [
      i + 1,
      t.docente_nome || '',
      t.docente_email || '',
      t.ateneo || '',
      t.classe_laurea || '',
      t.scenario || ''
    ];
    if (showVolume) row.push(t.volume_consigliato || '');
    row.push(
      t.tipo_azione || '',
      t.urgenza || '',
      (t.motivazione_scelta || '').replace(/"/g, '""')
    );
    return row;
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `monitoraggio_${materia.replace(/\s+/g, '_')}_${dateStr}.csv`);
  showToast('CSV esportato!', 'success');
}

// ===================================================
// INIZIALIZZAZIONE — listener per validazione form
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
  const materiaInput = document.getElementById('mon-materia');
  if (materiaInput) {
    materiaInput.addEventListener('input', validateMonitoraggioForm);
  }
});
