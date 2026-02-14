// ==========================================
// MATRIX Intelligence — Autenticazione
// ==========================================

// --- Pagina Login: Switch Tab ---
function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const configForm = document.getElementById('config-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const tabConfig = document.getElementById('tab-config');
  const msg = document.getElementById('auth-message');

  const activeClass = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all bg-white shadow text-zanichelli-blue';
  const inactiveClass = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700';

  // Nascondi tutti
  if (loginForm) loginForm.classList.add('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  if (configForm) configForm.classList.add('hidden');
  if (tabLogin) tabLogin.className = inactiveClass;
  if (tabRegister) tabRegister.className = inactiveClass;
  if (tabConfig) tabConfig.className = inactiveClass;

  if (tab === 'login' && loginForm) {
    loginForm.classList.remove('hidden');
    tabLogin.className = activeClass;
  } else if (tab === 'register' && registerForm) {
    registerForm.classList.remove('hidden');
    tabRegister.className = activeClass;
  } else if (tab === 'config' && configForm) {
    configForm.classList.remove('hidden');
    tabConfig.className = activeClass;
    // Popola campi
    document.getElementById('config-supabase-url').value = localStorage.getItem('matrix_supabase_url') || '';
    document.getElementById('config-supabase-key').value = localStorage.getItem('matrix_supabase_key') || '';
  }
  if (msg) msg.classList.add('hidden');
}

// --- Login ---
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  if (!supabaseClient) {
    showAuthMessage('Configura prima Supabase. Clicca sulla tab "Configura".', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accesso...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = '/dashboard';
  } catch (error) {
    showAuthMessage(error.message || 'Errore di accesso', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Accedi';
  }
}

// --- Registrazione ---
async function handleRegister(event) {
  event.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const btn = document.getElementById('register-btn');

  if (!supabaseClient) {
    showAuthMessage('Configura prima Supabase. Clicca sulla tab "Configura".', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrazione...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showAuthMessage('Questo indirizzo email è già registrato. Prova ad accedere.', 'error');
    } else if (data.session) {
      // Auto-login (conferma email disabilitata)
      showAuthMessage('Registrazione completata! Reindirizzamento...', 'success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
    } else {
      showAuthMessage('Registrazione completata! Controlla la tua email per il link di conferma, poi torna qui per accedere.', 'success');
    }
  } catch (error) {
    showAuthMessage(error.message || 'Errore di registrazione', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Crea Account';
  }
}

// --- Salva configurazione Supabase (dalla pagina login) ---
function handleSaveConfig(event) {
  event.preventDefault();
  const url = document.getElementById('config-supabase-url').value.trim();
  const key = document.getElementById('config-supabase-key').value.trim();

  if (!url || !key) {
    showAuthMessage('Inserisci sia URL che Anon Key di Supabase.', 'error');
    return;
  }

  // Validazione base
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    showAuthMessage('L\'URL deve essere nel formato https://xxxxx.supabase.co', 'error');
    return;
  }

  localStorage.setItem('matrix_supabase_url', url);
  localStorage.setItem('matrix_supabase_key', key);

  // Re-inizializza
  if (initSupabase()) {
    showAuthMessage('Supabase configurato con successo! Ora puoi registrarti o accedere.', 'success');
    // Aggiorna stato
    updateConfigStatus();
  } else {
    showAuthMessage('Errore nella configurazione. Verifica URL e chiave.', 'error');
  }
}

// --- Aggiorna indicatore stato configurazione ---
function updateConfigStatus() {
  const indicator = document.getElementById('config-status');
  if (!indicator) return;

  if (supabaseClient) {
    indicator.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i><span class="text-green-600 text-sm">Supabase connesso</span>';
  } else {
    indicator.innerHTML = '<i class="fas fa-exclamation-triangle text-yellow-500 mr-1"></i><span class="text-yellow-600 text-sm">Non configurato</span>';
  }
}

// --- Logout ---
async function handleLogout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  window.location.href = '/login';
}

// --- Mostra messaggio auth ---
function showAuthMessage(text, type) {
  const msg = document.getElementById('auth-message');
  if (!msg) return;
  msg.classList.remove('hidden');
  const color = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';
  msg.className = `mt-4 p-3 rounded-lg border text-sm ${color}`;
  msg.textContent = text;
}

// --- Check sessione (per dashboard) ---
async function checkSession() {
  if (!supabaseClient) {
    navigateTo('impostazioni');
    if (typeof showToast === 'function') {
      showToast('Configura la connessione Supabase nelle Impostazioni', 'warning', 6000);
    }
    return null;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return null;
    }
    
    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = session.user.email;
    
    return session;
  } catch (e) {
    console.error('Errore sessione:', e);
    return null;
  }
}

// --- Init pagina login ---
function initLoginPage() {
  initSupabase();
  updateConfigStatus();
  
  // Siamo sulla landing page (ha hero) o sulla pagina /login dedicata?
  const isLandingPage = !!document.querySelector('.hero-gradient');
  
  if (!supabaseClient) {
    // Mostra automaticamente la tab di configurazione
    switchTab('config');
  } else if (isLandingPage) {
    // Landing page: NON fare redirect automatico.
    // Se già loggato, trasforma "Accedi" in "Vai al Dashboard"
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Aggiorna pulsante hero
        const heroBtn = document.querySelector('a[href="#login-section"]');
        if (heroBtn) {
          heroBtn.href = '/dashboard';
          heroBtn.innerHTML = '<i class="fas fa-th-large"></i> Vai al Dashboard';
        }
        // Aggiorna pulsante submit login
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
          loginBtn.type = 'button';
          loginBtn.innerHTML = '<i class="fas fa-th-large"></i> Vai al Dashboard';
          loginBtn.onclick = () => { window.location.href = '/dashboard'; };
        }
        // Mostra badge "Già connesso" nel form
        const configStatus = document.getElementById('config-status');
        if (configStatus) {
          configStatus.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700"><i class="fas fa-check-circle mr-1"></i> Sei già connesso come <strong>' + (session.user.email || '') + '</strong></div>';
        }
      }
    });
    switchTab('login');
  } else {
    // Pagina /login dedicata: redirect automatico se già loggato
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/dashboard';
    });
  }
}

// --- Init pagina dashboard ---
async function initDashboard() {
  initSupabase();
  
  if (supabaseClient) {
    const session = await checkSession();
    if (session) {
      navigateTo('upload');
    }
  } else {
    navigateTo('impostazioni');
    showToast('Benvenuto! Configura Supabase e la API Key per iniziare.', 'info', 8000);
  }
}

// --- Auto-init ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form')) {
    initLoginPage();
  } else if (document.getElementById('sidebar')) {
    initDashboard();
  }
});
