// ==========================================
// MATRIX Intelligence — Autenticazione
// ==========================================

// --- Pagina Login: Switch Tab ---
function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const msg = document.getElementById('auth-message');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all bg-white shadow text-zanichelli-blue';
    tabRegister.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700';
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabRegister.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all bg-white shadow text-zanichelli-blue';
    tabLogin.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700';
  }
  if (msg) msg.classList.add('hidden');
}

// --- Login ---
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const msg = document.getElementById('auth-message');

  if (!supabase) {
    showAuthMessage('Configura prima Supabase nelle Impostazioni. Vai alla dashboard per configurare.', 'error');
    // Redirect to dashboard for configuration
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accesso...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  if (!supabase) {
    showAuthMessage('Configura prima Supabase nelle Impostazioni. Vai alla dashboard per configurare.', 'error');
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrazione...';

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    showAuthMessage('Registrazione completata! Controlla la tua email per confermare l\'account.', 'success');
  } catch (error) {
    showAuthMessage(error.message || 'Errore di registrazione', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Crea Account';
  }
}

// --- Logout ---
async function handleLogout() {
  if (supabase) {
    await supabase.auth.signOut();
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
  if (!supabase) {
    // Se Supabase non è configurato, mostra avviso nelle impostazioni
    navigateTo('impostazioni');
    if (typeof showToast === 'function') {
      showToast('Configura la connessione Supabase nelle Impostazioni', 'warning', 6000);
    }
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return null;
    }
    
    // Aggiorna UI con email utente
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
  
  // Se Supabase non è configurato, redirect alla dashboard per configurare
  if (!supabase) {
    const msg = document.getElementById('auth-message');
    if (msg) {
      msg.classList.remove('hidden');
      msg.className = 'mt-4 p-3 rounded-lg border text-sm bg-yellow-50 text-yellow-700 border-yellow-200';
      msg.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Supabase non configurato. <a href="/dashboard" class="underline font-medium">Vai alle Impostazioni</a>';
    }
  } else {
    // Controlla se già loggato
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/dashboard';
    });
  }
}

// --- Init pagina dashboard ---
async function initDashboard() {
  initSupabase();
  
  if (supabase) {
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
  // Determina quale pagina siamo
  if (document.getElementById('login-form')) {
    initLoginPage();
  } else if (document.getElementById('sidebar')) {
    initDashboard();
  }
});
