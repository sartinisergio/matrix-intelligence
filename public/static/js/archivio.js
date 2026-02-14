// ==========================================
// MATRIX Intelligence — Archivio Adozioni
// Banca dati bibliografica delle adozioni universitarie
// ==========================================

let allAdozioni = [];
let filteredAdozioni = [];

// --- Carica adozioni dal database ---
async function loadArchivio() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  try {
    const { data, error } = await supabaseClient
      .from('adozioni')
      .select('*')
      .eq('user_id', session.user.id)
      .order('ateneo', { ascending: true });

    if (error) throw error;

    allAdozioni = data || [];
    populateArchivioFilters();
    applyArchivioFilters();
    updateArchivioStats();
  } catch (e) {
    console.error('[Archivio] Errore caricamento:', e);
  }
}

// --- Aggiorna statistiche rapide ---
function updateArchivioStats() {
  // Raggruppa per programma_id per contare i programmi unici
  const programmiUnici = new Set(allAdozioni.map(a => a.programma_id));
  const ateneiUnici = new Set(allAdozioni.filter(a => a.ateneo).map(a => a.ateneo));
  const manualiUnici = new Set(allAdozioni.filter(a => a.manuale_titolo).map(a => `${a.manuale_titolo}|${a.manuale_autore || ''}`));
  const editoriUnici = new Set(allAdozioni.filter(a => a.manuale_editore).map(a => a.manuale_editore));

  document.getElementById('arch-stat-programmi').textContent = programmiUnici.size;
  document.getElementById('arch-stat-atenei').textContent = ateneiUnici.size;
  document.getElementById('arch-stat-manuali').textContent = manualiUnici.size;
  document.getElementById('arch-stat-editori').textContent = editoriUnici.size;
}

// --- Popola filtri dropdown ---
function populateArchivioFilters() {
  // Materie uniche
  const materie = [...new Set(allAdozioni.filter(a => a.insegnamento).map(a => a.insegnamento))].sort();
  const materiaSelect = document.getElementById('arch-filter-materia');
  if (materiaSelect) {
    const currentVal = materiaSelect.value;
    materiaSelect.innerHTML = '<option value="">Seleziona materia...</option>' +
      materie.map(m => `<option value="${m}">${m}</option>`).join('');
    materiaSelect.value = currentVal;
  }

  // Classi di laurea uniche
  const classi = [...new Set(allAdozioni.filter(a => a.classe_laurea).map(a => a.classe_laurea))].sort();
  const classeSelect = document.getElementById('arch-filter-classe');
  if (classeSelect) {
    const currentVal = classeSelect.value;
    classeSelect.innerHTML = '<option value="">Seleziona classe di laurea...</option>' +
      classi.map(c => `<option value="${c}">${c}</option>`).join('');
    classeSelect.value = currentVal;
  }
}

// --- Applica filtri ---
function applyArchivioFilters() {
  const materia = (document.getElementById('arch-filter-materia')?.value || '').toLowerCase();
  const ateneo = (document.getElementById('arch-filter-ateneo')?.value || '').toLowerCase().trim();
  const corso = (document.getElementById('arch-filter-corso')?.value || '').toLowerCase().trim();
  const classe = (document.getElementById('arch-filter-classe')?.value || '').toLowerCase();
  const docente = (document.getElementById('arch-filter-docente')?.value || '').toLowerCase().trim();
  const insegnamento = (document.getElementById('arch-filter-insegnamento')?.value || '').toLowerCase().trim();
  const titolo = (document.getElementById('arch-filter-titolo')?.value || '').toLowerCase().trim();
  const autore = (document.getElementById('arch-filter-autore')?.value || '').toLowerCase().trim();
  const editore = (document.getElementById('arch-filter-editore')?.value || '').toLowerCase().trim();
  const soloPrincipali = document.getElementById('arch-filter-principali')?.checked || false;

  filteredAdozioni = allAdozioni.filter(a => {
    if (materia && (a.insegnamento || '').toLowerCase() !== materia) return false;
    if (ateneo && !(a.ateneo || '').toLowerCase().includes(ateneo)) return false;
    if (corso && !(a.corso_laurea || '').toLowerCase().includes(corso)) return false;
    if (classe && (a.classe_laurea || '').toLowerCase() !== classe) return false;
    if (docente && !(a.docente_nome || '').toLowerCase().includes(docente)) return false;
    if (insegnamento && !(a.insegnamento || '').toLowerCase().includes(insegnamento)) return false;
    if (titolo && !(a.manuale_titolo || '').toLowerCase().includes(titolo)) return false;
    if (autore && !(a.manuale_autore || '').toLowerCase().includes(autore)) return false;
    if (editore && !(a.manuale_editore || '').toLowerCase().includes(editore)) return false;
    if (soloPrincipali && a.ruolo !== 'principale') return false;
    return true;
  });

  renderArchivio(filteredAdozioni);
}

// --- Reset filtri ---
function resetArchivioFilters() {
  const ids = ['arch-filter-materia', 'arch-filter-ateneo', 'arch-filter-corso', 'arch-filter-classe',
               'arch-filter-docente', 'arch-filter-insegnamento', 'arch-filter-titolo', 'arch-filter-autore',
               'arch-filter-editore'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const principali = document.getElementById('arch-filter-principali');
  if (principali) principali.checked = false;
  applyArchivioFilters();
}

// --- Render tabella archivio (raggruppato per programma) ---
function renderArchivio(adozioni) {
  const tbody = document.getElementById('arch-table-body');
  if (!tbody) return;

  // Contatore
  const programmiIds = new Set(adozioni.map(a => a.programma_id));
  const countEl = document.getElementById('arch-count');
  if (countEl) countEl.textContent = `${programmiIds.size} programmi, ${adozioni.length} adozioni trovate`;

  if (adozioni.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-12 text-center text-gray-400">
          <i class="fas fa-book-open text-3xl mb-2 block"></i>
          Nessuna adozione trovata. ${allAdozioni.length === 0 ? 'Conferma i match nel Database e usa "Archivia tutti i confermati".' : 'Prova a modificare i filtri.'}
        </td>
      </tr>`;
    return;
  }

  // Raggruppa per programma_id
  const grouped = {};
  adozioni.forEach(a => {
    if (!grouped[a.programma_id]) {
      grouped[a.programma_id] = {
        ateneo: a.ateneo,
        classe_laurea: a.classe_laurea,
        corso_laurea: a.corso_laurea,
        insegnamento: a.insegnamento,
        docente_nome: a.docente_nome,
        anno_accademico: a.anno_accademico,
        libri: []
      };
    }
    grouped[a.programma_id].libri.push({
      titolo: a.manuale_titolo,
      autore: a.manuale_autore,
      editore: a.manuale_editore,
      ruolo: a.ruolo,
      is_zanichelli: a.is_zanichelli
    });
  });

  // Ordina libri: principale prima, poi per titolo
  Object.values(grouped).forEach(g => {
    g.libri.sort((a, b) => {
      if (a.ruolo === 'principale' && b.ruolo !== 'principale') return -1;
      if (a.ruolo !== 'principale' && b.ruolo === 'principale') return 1;
      return (a.titolo || '').localeCompare(b.titolo || '');
    });
  });

  // Render
  tbody.innerHTML = Object.values(grouped).map(g => {
    const libriHtml = g.libri.map(l => {
      const star = l.ruolo === 'principale' ? '<i class="fas fa-star text-amber-400 mr-1" title="Testo principale"></i>' : '';
      const zanBadge = l.is_zanichelli ? '<span class="ml-1 px-1 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-medium">Z</span>' : '';
      const editoreStr = l.editore ? `, ${l.editore}` : '';
      const ruoloColor = l.ruolo === 'principale' ? 'text-gray-800 font-medium' : 'text-gray-600';
      return `<div class="py-1 ${ruoloColor}">${star}<strong>${l.titolo || 'N/D'}</strong> <span class="text-gray-400">(${l.autore || 'N/D'}${editoreStr})</span>${zanBadge}</div>`;
    }).join('');

    return `
      <tr class="border-t hover:bg-gray-50 align-top">
        <td class="px-4 py-3 text-gray-600 text-sm">${g.ateneo || '—'}</td>
        <td class="px-4 py-3 text-gray-500 text-xs">${g.classe_laurea || '—'}</td>
        <td class="px-4 py-3 text-gray-600 text-xs">${g.corso_laurea || '—'}</td>
        <td class="px-4 py-3 text-gray-600 text-sm">${g.insegnamento || '—'}</td>
        <td class="px-4 py-3 text-gray-800 text-sm font-medium">${g.docente_nome || '—'}</td>
        <td class="px-4 py-3 text-sm">${libriHtml}</td>
      </tr>`;
  }).join('');
}

// --- Export CSV ---
function exportArchivioCSV() {
  if (filteredAdozioni.length === 0) {
    showToast('Nessuna adozione da esportare', 'warning');
    return;
  }

  const headers = ['Ateneo', 'Classe di Laurea', 'Corso di Laurea', 'Insegnamento', 'Docente', 'Anno Accademico', 'Titolo Manuale', 'Autore Manuale', 'Editore', 'Ruolo', 'Zanichelli'];
  const rows = filteredAdozioni.map(a => [
    `"${(a.ateneo || '').replace(/"/g, '""')}"`,
    `"${(a.classe_laurea || '').replace(/"/g, '""')}"`,
    `"${(a.corso_laurea || '').replace(/"/g, '""')}"`,
    `"${(a.insegnamento || '').replace(/"/g, '""')}"`,
    `"${(a.docente_nome || '').replace(/"/g, '""')}"`,
    `"${(a.anno_accademico || '').replace(/"/g, '""')}"`,
    `"${(a.manuale_titolo || '').replace(/"/g, '""')}"`,
    `"${(a.manuale_autore || '').replace(/"/g, '""')}"`,
    `"${(a.manuale_editore || '').replace(/"/g, '""')}"`,
    a.ruolo || '',
    a.is_zanichelli ? 'Sì' : 'No'
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archivio_adozioni_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`${filteredAdozioni.length} adozioni esportate in CSV`, 'success');
}
