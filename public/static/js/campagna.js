// ==========================================
// MATRIX Intelligence — Campagne & Target
// ==========================================

let allCampaigns = [];
let currentTargets = [];
let currentCampaignId = null;

// --- Carica campagne ---
async function loadCampaigns() {
  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  try {
    const { data, error } = await supabase
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

// --- Render lista campagne ---
function renderCampaignsList() {
  const container = document.getElementById('campaigns-list');

  if (allCampaigns.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <i class="fas fa-bullseye text-4xl mb-3 block"></i>
        <p>Nessuna campagna creata</p>
        <p class="text-sm mt-1">Crea la tua prima campagna per generare liste target</p>
      </div>`;
    return;
  }

  container.innerHTML = allCampaigns.map(c => {
    const targetCount = (c.target_generati || []).length;
    const statusBadge = c.stato === 'completata' 
      ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Completata</span>'
      : '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Bozza</span>';

    return `
      <div class="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-1">
              <h3 class="font-semibold text-gray-800">${c.libro_titolo}</h3>
              ${statusBadge}
            </div>
            <p class="text-sm text-gray-500">${c.libro_autore || ''} ${c.libro_editore ? '— ' + c.libro_editore : ''}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span><i class="fas fa-tag mr-1"></i>${c.libro_materia || '—'}</span>
              <span><i class="fas fa-users mr-1"></i>${targetCount} target</span>
              <span><i class="fas fa-calendar mr-1"></i>${formatDate(c.created_at)}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            ${targetCount > 0 ? `
              <button onclick="viewTargets('${c.id}')" class="px-3 py-1.5 bg-zanichelli-accent text-zanichelli-blue rounded-lg text-sm hover:bg-blue-100 transition-colors" title="Vedi target">
                <i class="fas fa-list mr-1"></i>Target
              </button>` : `
              <button onclick="generateTargets('${c.id}')" class="px-3 py-1.5 bg-zanichelli-blue text-white rounded-lg text-sm hover:bg-zanichelli-dark transition-colors" title="Genera target">
                <i class="fas fa-magic mr-1"></i>Genera
              </button>`}
            <button onclick="deleteCampaign('${c.id}')" class="text-gray-400 hover:text-red-500 p-1" title="Elimina">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// --- Mostra / Nascondi form nuova campagna ---
function showNewCampaignForm() {
  document.getElementById('campaign-form-container').classList.remove('hidden');
  document.getElementById('btn-new-campaign').classList.add('hidden');
  document.getElementById('campaign-form').reset();
  document.getElementById('camp-editore').value = 'Zanichelli';
}

function hideCampaignForm() {
  document.getElementById('campaign-form-container').classList.add('hidden');
  document.getElementById('btn-new-campaign').classList.remove('hidden');
}

// --- Crea nuova campagna ---
async function handleCreateCampaign(event) {
  event.preventDefault();

  if (!supabase) {
    showToast('Configura Supabase nelle Impostazioni', 'error');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const temiInput = document.getElementById('camp-temi').value;
  const temi = temiInput ? temiInput.split(',').map(t => t.trim()).filter(Boolean) : [];

  const campaign = {
    user_id: session.user.id,
    libro_titolo: document.getElementById('camp-titolo').value,
    libro_autore: document.getElementById('camp-autore').value || null,
    libro_editore: document.getElementById('camp-editore').value || 'Zanichelli',
    libro_materia: document.getElementById('camp-materia').value,
    libro_indice: document.getElementById('camp-indice').value || null,
    libro_temi: temi,
    stato: 'bozza'
  };

  try {
    const { data, error } = await supabase.from('campagne').insert(campaign).select().single();
    if (error) throw error;

    showToast('Campagna creata! Ora genera la lista target.', 'success');
    hideCampaignForm();
    loadCampaigns();

    // Se ci sono temi, genera subito i target
    if (temi.length > 0 || campaign.libro_indice) {
      await generateTargets(data.id);
    }
  } catch (e) {
    showToast('Errore creazione campagna: ' + e.message, 'error');
  }
}

// --- Genera target per una campagna ---
async function generateTargets(campaignId) {
  const campaign = allCampaigns.find(c => c.id === campaignId);
  if (!campaign) {
    // Ricarica
    await loadCampaigns();
    return generateTargets(campaignId);
  }

  if (!CONFIG.OPENAI_API_KEY) {
    showToast('Configura la API Key OpenAI nelle Impostazioni', 'error');
    return;
  }

  // Carica tutti i programmi dell'utente
  const { data: { session } } = await supabase.auth.getSession();
  const { data: programs, error } = await supabase
    .from('programmi')
    .select('*')
    .eq('user_id', session.user.id);

  if (error || !programs || programs.length === 0) {
    showToast('Nessun programma nel database. Carica prima dei PDF.', 'warning');
    return;
  }

  // Step 1: Se non ci sono temi, generali dall'indice
  let bookThemes = campaign.libro_temi || [];
  if (bookThemes.length === 0 && campaign.libro_indice) {
    showToast('Generazione temi dal sommario...', 'info');
    try {
      const themeResult = await callOpenAI(
        'Estrai 10-15 temi/argomenti chiave dal seguente indice di un libro accademico. Rispondi con JSON: {"temi": ["tema1", "tema2", ...]}',
        campaign.libro_indice,
        true
      );
      bookThemes = themeResult.temi || [];
      
      // Aggiorna la campagna con i temi generati
      await supabase.from('campagne').update({ libro_temi: bookThemes }).eq('id', campaignId);
      campaign.libro_temi = bookThemes;
    } catch (e) {
      showToast('Errore generazione temi: ' + e.message, 'error');
      return;
    }
  }

  if (bookThemes.length === 0) {
    showToast('Inserisci almeno dei temi chiave o un indice per la campagna', 'warning');
    return;
  }

  // Step 2: Matching
  showToast('Calcolo rilevanza in corso...', 'info');
  const targets = [];

  for (const prog of programs) {
    const result = calculateRelevance(campaign, prog, bookThemes);
    if (result) {
      targets.push(result);
    }
  }

  // Ordina: Alta prima, poi Media, poi Bassa
  // All'interno di ogni livello, zanichelli_alternativo > zanichelli_assente > zanichelli_principale
  const relevanceOrder = { 'alta': 0, 'media': 1, 'bassa': 2 };
  const scenarioOrder = { 'zanichelli_alternativo': 0, 'zanichelli_assente': 1, 'zanichelli_principale': 2 };

  targets.sort((a, b) => {
    const relDiff = (relevanceOrder[a.rilevanza] || 3) - (relevanceOrder[b.rilevanza] || 3);
    if (relDiff !== 0) return relDiff;
    return (scenarioOrder[a.scenario] || 3) - (scenarioOrder[b.scenario] || 3);
  });

  // Step 3: Genera motivazioni LLM per target Alta e Media
  const targetProgress = document.getElementById('target-progress');
  const targetProgressBar = document.getElementById('target-progress-bar');
  const targetProgressText = document.getElementById('target-progress-text');

  // Mostra risultati
  document.getElementById('target-results-container').classList.remove('hidden');
  document.getElementById('target-campaign-title').textContent = campaign.libro_titolo;

  const highMedTargets = targets.filter(t => t.rilevanza === 'alta' || t.rilevanza === 'media');
  
  if (highMedTargets.length > 0) {
    targetProgress.classList.remove('hidden');

    for (let i = 0; i < highMedTargets.length; i++) {
      const t = highMedTargets[i];
      const pct = Math.round(((i + 1) / highMedTargets.length) * 100);
      targetProgressBar.style.width = pct + '%';
      targetProgressText.textContent = `${i + 1}/${highMedTargets.length}`;

      try {
        const bookData = {
          titolo: campaign.libro_titolo,
          autore: campaign.libro_autore,
          materia: campaign.libro_materia,
          temi: bookThemes
        };

        const mainManual = (t.programData.manuali_citati || []).find(m => m.ruolo === 'principale');
        const targetData = {
          docente_nome: t.programData.docente_nome,
          ateneo: t.programData.ateneo,
          materia_inferita: t.programData.materia_inferita,
          temi_principali: t.programData.temi_principali,
          manuale_attuale: mainManual ? `${mainManual.titolo} (${mainManual.autore})` : 'Nessuno citato',
          scenario_zanichelli: t.programData.scenario_zanichelli
        };

        t.motivazione = await generateMotivation(bookData, targetData);
      } catch (e) {
        t.motivazione = 'Errore nella generazione della motivazione.';
      }

      if (i < highMedTargets.length - 1) {
        await sleep(CONFIG.BATCH_DELAY_MS);
      }
    }

    targetProgress.classList.add('hidden');
  }

  // Motivazione generica per bassa rilevanza
  targets.filter(t => t.rilevanza === 'bassa').forEach(t => {
    const commonThemes = t.temiComuni.slice(0, 3).join(', ');
    t.motivazione = `Il corso tratta temi affini (${commonThemes}) che potrebbero beneficiare del nuovo testo come risorsa complementare.`;
  });

  // Salva target nella campagna
  const targetData = targets.map(t => ({
    programma_id: t.programData.id,
    docente_nome: t.programData.docente_nome,
    docente_email: t.programData.docente_email,
    ateneo: t.programData.ateneo,
    materia: t.programData.materia_inferita,
    scenario: t.programData.scenario_zanichelli,
    rilevanza: t.rilevanza,
    overlap_pct: t.overlapPct,
    motivazione: t.motivazione,
    temi_comuni: t.temiComuni
  }));

  try {
    await supabase.from('campagne').update({
      target_generati: targetData,
      stato: 'completata',
      updated_at: new Date().toISOString()
    }).eq('id', campaignId);
  } catch (e) {
    console.error('Errore salvataggio target:', e);
  }

  // Render results
  currentTargets = targetData;
  currentCampaignId = campaignId;
  renderTargets(targetData);
  loadCampaigns(); // Aggiorna lista campagne
}

// --- Algoritmo di Matching ---
function calculateRelevance(campaign, program, bookThemes) {
  const progThemes = (program.temi_principali || []).map(t => t.toLowerCase());
  const bkThemes = bookThemes.map(t => t.toLowerCase());

  // Calcola overlap tematico (con partial matching)
  let matchCount = 0;
  const temiComuni = [];

  for (const bt of bkThemes) {
    for (const pt of progThemes) {
      if (
        bt === pt ||
        bt.includes(pt) || pt.includes(bt) ||
        levenshteinSimilarity(bt, pt) > 0.7
      ) {
        matchCount++;
        temiComuni.push(pt);
        break;
      }
    }
  }

  const overlapPct = bkThemes.length > 0 ? matchCount / bkThemes.length : 0;

  // Materia match
  const subjectMatch = campaign.libro_materia && program.materia_inferita &&
    (campaign.libro_materia.toLowerCase().includes(program.materia_inferita.toLowerCase()) ||
     program.materia_inferita.toLowerCase().includes(campaign.libro_materia.toLowerCase()));

  // Classificazione rilevanza
  let rilevanza = null;

  if (subjectMatch && overlapPct >= 0.5) {
    rilevanza = 'alta';
  } else if ((subjectMatch && overlapPct >= 0.25) || (!subjectMatch && overlapPct >= 0.5)) {
    rilevanza = 'media';
  } else if (overlapPct >= 0.15) {
    rilevanza = 'bassa';
  }

  if (!rilevanza) return null; // Escluso

  return {
    programData: program,
    rilevanza,
    overlapPct: Math.round(overlapPct * 100),
    temiComuni: [...new Set(temiComuni)],
    scenario: program.scenario_zanichelli,
    motivazione: ''
  };
}

// --- Similarità Levenshtein (semplificata) ---
function levenshteinSimilarity(a, b) {
  if (a.length === 0) return 0;
  if (b.length === 0) return 0;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[a.length][b.length] / maxLen;
}

// --- Vedi target di una campagna ---
function viewTargets(campaignId) {
  const campaign = allCampaigns.find(c => c.id === campaignId);
  if (!campaign) return;

  currentTargets = campaign.target_generati || [];
  currentCampaignId = campaignId;

  document.getElementById('target-results-container').classList.remove('hidden');
  document.getElementById('target-campaign-title').textContent = campaign.libro_titolo;

  renderTargets(currentTargets);
}

// --- Render target table ---
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
      <tr>
        <td colspan="7" class="px-4 py-8 text-center text-gray-400">
          Nessun target trovato con rilevanza sufficiente
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = targets.map((t, i) => {
    const rowBg = t.rilevanza === 'alta' ? 'bg-green-50/50' : t.rilevanza === 'media' ? 'bg-yellow-50/30' : '';
    return `
      <tr class="border-t ${rowBg}">
        <td class="px-4 py-3 text-gray-500 text-xs">${i + 1}</td>
        <td class="px-4 py-3">
          <div class="font-medium text-gray-800">${t.docente_nome || '—'}</div>
          ${t.docente_email ? `<div class="text-xs text-gray-400">${t.docente_email}</div>` : ''}
        </td>
        <td class="px-4 py-3 text-gray-600 text-sm">${t.ateneo || '—'}</td>
        <td class="px-4 py-3 text-gray-600 text-sm">${t.materia || '—'}</td>
        <td class="px-4 py-3">${scenarioBadge(t.scenario)}</td>
        <td class="px-4 py-3">
          ${relevanceBadge(t.rilevanza)}
          <div class="text-xs text-gray-400 mt-1">${t.overlap_pct || 0}% overlap</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 max-w-xs">${t.motivazione || '—'}</td>
      </tr>`;
  }).join('');
}

// --- Export CSV ---
function exportTargetCSV() {
  if (!currentTargets || currentTargets.length === 0) {
    showToast('Nessun target da esportare', 'warning');
    return;
  }

  const campaign = allCampaigns.find(c => c.id === currentCampaignId);
  const headers = ['#', 'Docente', 'Email', 'Ateneo', 'Materia', 'Scenario', 'Rilevanza', 'Overlap %', 'Motivazione'];
  const rows = currentTargets.map((t, i) => [
    i + 1,
    `"${(t.docente_nome || '').replace(/"/g, '""')}"`,
    `"${(t.docente_email || '').replace(/"/g, '""')}"`,
    `"${(t.ateneo || '').replace(/"/g, '""')}"`,
    `"${(t.materia || '').replace(/"/g, '""')}"`,
    t.scenario || '',
    t.rilevanza || '',
    t.overlap_pct || 0,
    `"${(t.motivazione || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const filename = `target_${(campaign?.libro_titolo || 'campagna').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csv, filename);
  showToast('CSV esportato!', 'success');
}

// --- Elimina campagna ---
async function deleteCampaign(id) {
  if (!confirm('Eliminare questa campagna e tutti i target generati?')) return;

  try {
    const { error } = await supabase.from('campagne').delete().eq('id', id);
    if (error) throw error;

    showToast('Campagna eliminata', 'success');
    document.getElementById('target-results-container').classList.add('hidden');
    loadCampaigns();
  } catch (e) {
    showToast('Errore eliminazione: ' + e.message, 'error');
  }
}

// --- Impostazioni: Funzioni ---
function loadSettings() {
  const apikey = CONFIG.OPENAI_API_KEY;
  const model = CONFIG.LLM_MODEL;
  const supaUrl = localStorage.getItem('matrix_supabase_url') || '';
  const supaKey = localStorage.getItem('matrix_supabase_key') || '';

  document.getElementById('settings-apikey').value = apikey;
  document.getElementById('settings-model').value = model;
  document.getElementById('settings-supabase-url').value = supaUrl;
  document.getElementById('settings-supabase-key').value = supaKey;

  // Status API key
  const status = document.getElementById('apikey-status');
  if (apikey) {
    status.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i><span class="text-green-600">API Key configurata</span>';
  } else {
    status.innerHTML = '<i class="fas fa-exclamation-circle text-yellow-500 mr-1"></i><span class="text-yellow-600">Nessuna API Key configurata</span>';
  }

  // Status Supabase
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

  // Re-inizializza Supabase
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
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}
