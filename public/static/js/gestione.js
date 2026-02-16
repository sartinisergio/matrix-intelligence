// ==========================================
// MATRIX Intelligence — Gestione (Manager)
// Sezione riservata al ruolo 'gestore'
// ==========================================

// Variabile globale ruolo utente (impostata da auth.js)
// let currentUserRole = 'promotore'; // default — definita in auth.js

// ===================================================
// CARICAMENTO SEZIONE GESTIONE
// ===================================================

async function loadGestione() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  // Solo il gestore puo accedere
  if (typeof currentUserRole === 'undefined' || currentUserRole !== 'gestore') {
    showToast('Accesso riservato al gestore', 'warning');
    navigateTo('upload');
    return;
  }

  // Carica framework e catalogo condivisi da Supabase
  await loadSharedFrameworks();
  await loadSharedCatalog();
  await loadUsersList();
}

// ===================================================
// FRAMEWORK CONDIVISI (tabella frameworks_condivisi)
// ===================================================

let sharedFrameworks = [];

async function loadSharedFrameworks() {
  try {
    const { data, error } = await supabaseClient
      .from('frameworks_condivisi')
      .select('*')
      .order('materia', { ascending: true });

    if (error) throw error;
    sharedFrameworks = data || [];
    renderSharedFrameworks();
  } catch (e) {
    console.error('[Gestione] Errore caricamento framework condivisi:', e);
    // Tabella potrebbe non esistere ancora
    const el = document.getElementById('gestione-frameworks-list');
    if (el) el.innerHTML = `<p class="text-sm text-red-500"><i class="fas fa-exclamation-triangle mr-1"></i>Tabella non trovata. Esegui la migration SQL.</p>`;
  }
}

function renderSharedFrameworks() {
  const el = document.getElementById('gestione-frameworks-list');
  if (!el) return;

  if (sharedFrameworks.length === 0) {
    el.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fas fa-cubes text-3xl mb-2 block"></i>
        <p>Nessun framework caricato. Usa il pulsante sopra per importarne uno.</p>
      </div>`;
    return;
  }

  el.innerHTML = sharedFrameworks.map(fw => {
    const moduliCount = fw.dati?.syllabus_modules?.length || 0;
    const profileCount = fw.dati?.program_profiles?.length || 0;
    const conceptCount = (fw.dati?.syllabus_modules || []).reduce((sum, m) => sum + (m.key_concepts || []).length, 0);
    return `
      <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
        <div>
          <span class="font-medium text-gray-800">${fw.nome || fw.materia}</span>
          <span class="text-xs text-gray-400 ml-2">${fw.materia}</span>
          <div class="text-xs text-gray-500 mt-0.5">${moduliCount} moduli, ${conceptCount} concetti, ${profileCount} profili</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">${formatDate(fw.updated_at || fw.created_at)}</span>
          <button onclick="deleteSharedFramework('${fw.id}')" class="text-red-400 hover:text-red-600 text-xs p-1" title="Elimina">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

async function uploadSharedFramework() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const content = data.content || data;

      if (!content.syllabus_modules || !Array.isArray(content.syllabus_modules)) {
        showToast('Il file non contiene syllabus_modules validi', 'error');
        return;
      }

      const nome = data.name || file.name.replace('.json', '');
      const materia = data.subject || prompt('Materia di riferimento per questo framework:', nome);
      if (!materia) return;

      const { data: { session } } = await supabaseClient.auth.getSession();

      const fwRecord = {
        nome: nome,
        materia: materia,
        dati: {
          syllabus_modules: content.syllabus_modules,
          program_profiles: content.program_profiles || []
        },
        caricato_da: session.user.id,
        updated_at: new Date().toISOString()
      };

      // Upsert: se esiste gia per questa materia, aggiorna
      const existing = sharedFrameworks.find(f => f.materia.toLowerCase() === materia.toLowerCase());
      if (existing) {
        const { error } = await supabaseClient.from('frameworks_condivisi').update(fwRecord).eq('id', existing.id);
        if (error) throw error;
        showToast(`Framework "${nome}" aggiornato per ${materia}!`, 'success');
      } else {
        const { error } = await supabaseClient.from('frameworks_condivisi').insert(fwRecord);
        if (error) throw error;
        showToast(`Framework "${nome}" caricato per ${materia}!`, 'success');
      }

      await loadSharedFrameworks();
    } catch (e) {
      showToast('Errore: ' + e.message, 'error');
    }
  };
  input.click();
}

async function deleteSharedFramework(id) {
  if (!confirm('Eliminare questo framework condiviso?')) return;
  try {
    const { error } = await supabaseClient.from('frameworks_condivisi').delete().eq('id', id);
    if (error) throw error;
    showToast('Framework eliminato', 'success');
    await loadSharedFrameworks();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// ===================================================
// CATALOGO MANUALI CONDIVISO (tabella catalogo_manuali_condiviso)
// ===================================================

let sharedCatalog = [];

async function loadSharedCatalog() {
  try {
    const { data, error } = await supabaseClient
      .from('catalogo_manuali_condiviso')
      .select('*')
      .order('materia', { ascending: true });

    if (error) throw error;
    sharedCatalog = data || [];
    renderSharedCatalog();
  } catch (e) {
    console.error('[Gestione] Errore caricamento catalogo condiviso:', e);
    const el = document.getElementById('gestione-catalogo-list');
    if (el) el.innerHTML = `<p class="text-sm text-red-500"><i class="fas fa-exclamation-triangle mr-1"></i>Tabella non trovata. Esegui la migration SQL.</p>`;
  }
}

function renderSharedCatalog() {
  const el = document.getElementById('gestione-catalogo-list');
  if (!el) return;

  if (sharedCatalog.length === 0) {
    el.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fas fa-book text-3xl mb-2 block"></i>
        <p>Nessun manuale caricato. Usa il pulsante sopra per importarne.</p>
      </div>`;
    return;
  }

  // Raggruppa per materia
  const byMateria = {};
  sharedCatalog.forEach(m => {
    const mat = m.materia || 'Altro';
    if (!byMateria[mat]) byMateria[mat] = [];
    byMateria[mat].push(m);
  });

  let html = '';
  Object.keys(byMateria).sort().forEach(mat => {
    const manuali = byMateria[mat];
    html += `
      <div class="mb-3">
        <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">${mat} (${manuali.length})</div>
        <div class="space-y-1">
          ${manuali.map(m => {
            const isZan = m.is_zanichelli;
            return `
              <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border text-sm">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="text-xs ${isZan ? 'text-blue-500' : 'text-gray-400'}">${isZan ? '🔵' : '⚪'}</span>
                  <span class="font-medium text-gray-700 truncate">${m.titolo}</span>
                  <span class="text-xs text-gray-400 truncate">${m.autore || ''} — ${m.editore || ''}</span>
                </div>
                <button onclick="deleteSharedManual('${m.id}')" class="text-red-400 hover:text-red-600 text-xs p-1 ml-2 flex-shrink-0" title="Elimina">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  el.innerHTML = html;
}

async function uploadSharedManuals() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    let loaded = 0;
    let errors = 0;

    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.title || !data.chapters) {
          errors++;
          continue;
        }

        const materia = data.subject || prompt(`Materia per "${data.title}":`, '');
        if (!materia) continue;

        const isZan = data.type === 'zanichelli' || (data.publisher || '').toLowerCase() === 'zanichelli';

        const record = {
          titolo: data.title,
          autore: data.author || '',
          editore: data.publisher || '',
          materia: materia,
          is_zanichelli: isZan,
          capitoli_count: data.chapters.length,
          dati: {
            chapters: data.chapters,
            chapters_summary: data.chapters.map(ch => `${ch.number || ''}: ${ch.title || ''}`).join('\n'),
            temi_chiave: data.chapters.map(ch => `${ch.number || ''}: ${ch.title || ''}`)
          },
          caricato_da: session.user.id,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient.from('catalogo_manuali_condiviso').insert(record);
        if (error) throw error;
        loaded++;
      } catch (err) {
        console.error('Errore upload manuale:', err);
        errors++;
      }
    }

    showToast(`${loaded} manuali caricati${errors > 0 ? `, ${errors} errori` : ''}`, loaded > 0 ? 'success' : 'error');
    await loadSharedCatalog();
  };
  input.click();
}

async function deleteSharedManual(id) {
  if (!confirm('Eliminare questo manuale condiviso?')) return;
  try {
    const { error } = await supabaseClient.from('catalogo_manuali_condiviso').delete().eq('id', id);
    if (error) throw error;
    showToast('Manuale eliminato', 'success');
    await loadSharedCatalog();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// ===================================================
// GESTIONE UTENTI (tabella profili)
// ===================================================

let allUsers = [];

async function loadUsersList() {
  try {
    const { data, error } = await supabaseClient
      .from('profili')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    allUsers = data || [];
    renderUsersList();
  } catch (e) {
    console.error('[Gestione] Errore caricamento utenti:', e);
    const el = document.getElementById('gestione-users-list');
    if (el) el.innerHTML = `<p class="text-sm text-red-500"><i class="fas fa-exclamation-triangle mr-1"></i>Tabella profili non trovata. Esegui la migration SQL.</p>`;
  }
}

function renderUsersList() {
  const el = document.getElementById('gestione-users-list');
  if (!el) return;

  if (allUsers.length === 0) {
    el.innerHTML = `<p class="text-sm text-gray-400">Nessun utente trovato.</p>`;
    return;
  }

  el.innerHTML = allUsers.map(u => {
    const isGestore = u.ruolo === 'gestore';
    return `
      <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${isGestore ? 'bg-zanichelli-blue' : 'bg-gray-300'} flex items-center justify-center">
            <i class="fas ${isGestore ? 'fa-crown' : 'fa-user'} text-white text-xs"></i>
          </div>
          <div>
            <span class="font-medium text-gray-800">${u.email || u.user_id}</span>
            <div class="text-xs text-gray-400">Registrato: ${formatDate(u.created_at)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${isGestore ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
            ${u.ruolo || 'promotore'}
          </span>
          ${!isGestore ? `
            <button onclick="promoteUser('${u.user_id}')" 
                    class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    title="Promuovi a gestore">
              <i class="fas fa-arrow-up mr-1"></i>Promuovi
            </button>` : `
            <button onclick="demoteUser('${u.user_id}')" 
                    class="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors"
                    title="Rimuovi ruolo gestore">
              <i class="fas fa-arrow-down mr-1"></i>Declassa
            </button>`}
        </div>
      </div>`;
  }).join('');
}

async function promoteUser(userId) {
  if (!confirm('Promuovere questo utente a gestore?')) return;
  try {
    const { error } = await supabaseClient
      .from('profili')
      .update({ ruolo: 'gestore', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
    showToast('Utente promosso a gestore!', 'success');
    await loadUsersList();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

async function demoteUser(userId) {
  if (!confirm('Rimuovere il ruolo gestore? L\'utente tornera promotore.')) return;
  try {
    const { error } = await supabaseClient
      .from('profili')
      .update({ ruolo: 'promotore', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
    showToast('Utente declassato a promotore', 'success');
    await loadUsersList();
  } catch (e) {
    showToast('Errore: ' + e.message, 'error');
  }
}

// ===================================================
// IMPORT MASSIVO DA SYNC MATRIX → SUPABASE CONDIVISO
// ===================================================

async function syncToSharedFromLocal() {
  // Prende i dati gia sincronizzati da Matrix (localStorage) e li carica nelle tabelle condivise
  if (!confirm('Importare framework e catalogo da Matrix (localStorage) nelle tabelle condivise Supabase?\nQuesto rendera i dati disponibili a tutti gli utenti.')) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  let fwCount = 0, manCount = 0;

  // Framework
  const syncedFw = localStorage.getItem('matrix_sync_frameworks');
  if (syncedFw) {
    const fwData = JSON.parse(syncedFw);
    for (const fw of (fwData.frameworks || [])) {
      try {
        const record = {
          nome: fw.name || fw.id,
          materia: fw.subject || fw.name || '',
          dati: {
            syllabus_modules: fw.syllabus_modules || [],
            program_profiles: fw.program_profiles || []
          },
          caricato_da: session.user.id,
          updated_at: new Date().toISOString()
        };
        // Upsert per materia
        const existing = sharedFrameworks.find(f => f.materia.toLowerCase() === record.materia.toLowerCase());
        if (existing) {
          await supabaseClient.from('frameworks_condivisi').update(record).eq('id', existing.id);
        } else {
          await supabaseClient.from('frameworks_condivisi').insert(record);
        }
        fwCount++;
      } catch (e) {
        console.error('Errore sync framework condiviso:', fw.name, e);
      }
    }
  }

  // Manuali
  const syncedMan = localStorage.getItem('matrix_sync_manuals');
  if (syncedMan) {
    const manData = JSON.parse(syncedMan);
    for (const m of (manData.manuals || [])) {
      try {
        const record = {
          titolo: m.title || '',
          autore: m.author || '',
          editore: m.publisher || '',
          materia: m.subject || '',
          is_zanichelli: m.is_zanichelli || false,
          capitoli_count: m.chapters_count || 0,
          dati: {
            chapters_summary: m.chapters_summary || '',
            temi_chiave: m.temi_chiave || []
          },
          caricato_da: session.user.id,
          updated_at: new Date().toISOString()
        };
        // Controlla duplicati per titolo + autore
        const existing = sharedCatalog.find(c => 
          c.titolo.toLowerCase() === record.titolo.toLowerCase() && 
          c.autore.toLowerCase() === record.autore.toLowerCase()
        );
        if (!existing) {
          await supabaseClient.from('catalogo_manuali_condiviso').insert(record);
          manCount++;
        }
      } catch (e) {
        console.error('Errore sync manuale condiviso:', m.title, e);
      }
    }
  }

  showToast(`Importati ${fwCount} framework e ${manCount} nuovi manuali nelle tabelle condivise!`, 'success');
  await loadSharedFrameworks();
  await loadSharedCatalog();
}
