// ==========================================
// MATRIX Intelligence — Utilità
// ==========================================

// --- Toast Notifications ---
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500 text-yellow-900',
    info: 'bg-zanichelli-light'
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform translate-x-full transition-transform duration-300 max-w-sm`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span class="text-sm">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
    toast.classList.add('translate-x-0');
  });

  setTimeout(() => {
    toast.classList.remove('translate-x-0');
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Formattazione ---
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(str, maxLen = 50) {
  if (!str) return '—';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

// --- Scenario Badge ---
function scenarioBadge(scenario) {
  const map = {
    'zanichelli_principale': { label: 'Principale', class: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    'zanichelli_alternativo': { label: 'Alternativo', class: 'bg-yellow-100 text-yellow-700', icon: 'fa-exchange-alt' },
    'zanichelli_assente': { label: 'Assente', class: 'bg-red-100 text-red-700', icon: 'fa-times-circle' }
  };
  const s = map[scenario] || { label: scenario || '—', class: 'bg-gray-100 text-gray-600', icon: 'fa-question-circle' };
  return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.class}">
    <i class="fas ${s.icon} text-[10px]"></i>${s.label}
  </span>`;
}

// --- Relevance Badge ---
function relevanceBadge(level) {
  const map = {
    'alta': { label: 'Alta', class: 'bg-green-100 text-green-700' },
    'media': { label: 'Media', class: 'bg-yellow-100 text-yellow-700' },
    'bassa': { label: 'Bassa', class: 'bg-orange-100 text-orange-700' }
  };
  const r = map[level] || { label: level, class: 'bg-gray-100 text-gray-600' };
  return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.class}">${r.label}</span>`;
}

// --- Navigazione ---
function navigateTo(section) {
  // Nascondi tutte le sezioni
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  // Mostra la sezione richiesta
  const target = document.getElementById('section-' + section);
  if (target) target.classList.remove('hidden');

  // Aggiorna navigazione attiva
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('bg-white/10', 'text-white');
    btn.classList.add('text-blue-200');
  });
  const activeNav = document.getElementById('nav-' + section);
  if (activeNav) {
    activeNav.classList.add('bg-white/10', 'text-white');
    activeNav.classList.remove('text-blue-200');
  }

  // Chiudi sidebar mobile
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
  }

  // Carica dati per la sezione
  if (section === 'database') loadDatabase();
  if (section === 'campagne') loadCampaigns();
  if (section === 'impostazioni') loadSettings();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

// --- Modal ---
function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// --- Escape key per modal ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay')?.classList.add('hidden');
  }
});

// --- CSV Export Helper ---
function downloadCSV(data, filename) {
  const BOM = '\uFEFF';
  const csv = BOM + data;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Sleep ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
