// ==========================================
// MATRIX Intelligence — Database Programmi
// ==========================================

let allPrograms = [];

// --- Carica programmi dal database ---
async function loadDatabase() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  try {
    const { data, error } = await supabaseClient
      .from('programmi')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allPrograms = data || [];
    populateFilters();
    applyFilters();
  } catch (e) {
    showToast('Errore caricamento database: ' + e.message, 'error');
  }
}

// --- Popola i select dei filtri ---
function populateFilters() {
  const materie = [...new Set(allPrograms.map(p => p.materia_inferita).filter(Boolean))].sort();
  const atenei = [...new Set(allPrograms.map(p => p.ateneo).filter(Boolean))].sort();

  const materiaSelect = document.getElementById('filter-materia');
  const ateneoSelect = document.getElementById('filter-ateneo');

  // Salva selezione corrente
  const currentMateria = materiaSelect.value;
  const currentAteneo = ateneoSelect.value;

  materiaSelect.innerHTML = '<option value="">Tutte le materie</option>' +
    materie.map(m => `<option value="${m}">${m}</option>`).join('');
  ateneoSelect.innerHTML = '<option value="">Tutti gli atenei</option>' +
    atenei.map(a => `<option value="${a}">${a}</option>`).join('');

  // Ripristina selezione
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

// --- Render tabella ---
function renderTable(programs) {
  const tbody = document.getElementById('db-table-body');

  if (programs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-12 text-center text-gray-400">
          <i class="fas fa-inbox text-3xl mb-2 block"></i>
          Nessun programma trovato. Carica dei PDF dalla sezione Upload.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = programs.map(p => {
    const mainManual = (p.manuali_citati || []).find(m => m.ruolo === 'principale');
    const manualText = mainManual ? `${mainManual.autore || ''} — ${mainManual.titolo || ''}` : '—';

    // Colore riga per scenario
    const rowBg = p.scenario_zanichelli === 'zanichelli_principale' ? 'bg-green-50/50' :
                  p.scenario_zanichelli === 'zanichelli_alternativo' ? 'bg-yellow-50/50' : '';

    return `
      <tr class="border-t hover:bg-gray-50 cursor-pointer ${rowBg}" onclick="showProgramDetail('${p.id}')">
        <td class="px-4 py-3">
          <div class="font-medium text-gray-800">${p.docente_nome || '—'}</div>
          ${p.docente_email ? `<div class="text-xs text-gray-400">${p.docente_email}</div>` : ''}
        </td>
        <td class="px-4 py-3 text-gray-600">${p.ateneo || '—'}</td>
        <td class="px-4 py-3 text-gray-600">${p.materia_inferita || '—'}</td>
        <td class="px-4 py-3 text-gray-500 text-xs">${p.classe_laurea || '—'}</td>
        <td class="px-4 py-3 text-gray-600 text-xs">${truncate(manualText, 40)}</td>
        <td class="px-4 py-3">${scenarioBadge(p.scenario_zanichelli)}</td>
        <td class="px-4 py-3 text-center">
          <div class="flex items-center justify-center gap-2">
            <button onclick="event.stopPropagation(); showProgramDetail('${p.id}')" 
                    class="text-zanichelli-light hover:text-zanichelli-blue" title="Dettaglio">
              <i class="fas fa-eye"></i>
            </button>
            <button onclick="event.stopPropagation(); editProgram('${p.id}')" 
                    class="text-gray-400 hover:text-zanichelli-blue" title="Modifica">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="event.stopPropagation(); deleteProgram('${p.id}')" 
                    class="text-gray-400 hover:text-red-500" title="Elimina">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
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

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Info docente -->
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

      <!-- Temi -->
      <div>
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Temi Principali</label>
        <div class="flex flex-wrap gap-2">${temi || '<span class="text-gray-400">Nessun tema</span>'}</div>
      </div>

      <!-- Manuali -->
      <div>
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Manuali Citati</label>
        <div class="space-y-2">${manuali || '<p class="text-gray-400">Nessun manuale citato</p>'}</div>
      </div>

      <!-- File sorgente -->
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
