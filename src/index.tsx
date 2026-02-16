import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS per le chiamate API
app.use('/api/*', cors())

// ==========================================
// PAGINE HTML
// ==========================================

// Pagina Login
app.get('/', (c) => {
  return c.html(loginPage())
})

app.get('/login', (c) => {
  return c.html(loginPage())
})

// Dashboard principale
app.get('/dashboard', (c) => {
  return c.html(dashboardPage())
})

// ==========================================
// API ROUTES (proxy per sicurezza futura)
// ==========================================

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '0.1.0', name: 'MATRIX Intelligence' })
})

export default app

// ==========================================
// TEMPLATE: Login Page
// ==========================================
function loginPage(): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MATRIX Intelligence — Analisi di mercato editoriale universitario</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <link href="/static/css/styles.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            zanichelli: { 
              blue: '#003B7B', 
              light: '#0066CC', 
              accent: '#E8F0FE',
              dark: '#002654'
            }
          }
        }
      }
    }
  </script>
  <style>
    .hero-gradient { background: linear-gradient(135deg, #002654 0%, #003B7B 40%, #0066CC 100%); }
    .feature-card { transition: transform 0.2s, box-shadow 0.2s; }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,59,123,0.15); }
    .step-line { position: relative; }
    .step-line::after { content: ''; position: absolute; top: 50%; right: -32px; width: 32px; height: 2px; background: #0066CC; }
    .step-line:last-child::after { display: none; }
    @media (max-width: 768px) { .step-line::after { display: none; } }
    html { scroll-behavior: smooth; }
  </style>
</head>
<body class="min-h-screen bg-gray-50">

  <!-- ===================== HERO ===================== -->
  <section class="hero-gradient min-h-[80vh] flex items-center relative overflow-hidden">
    <!-- Pattern decorativo -->
    <div class="absolute inset-0 opacity-5">
      <div class="absolute top-20 left-10 text-9xl font-bold text-white">M</div>
      <div class="absolute bottom-10 right-10 text-9xl font-bold text-white">I</div>
    </div>
    
    <div class="max-w-6xl mx-auto px-6 py-20 relative z-10 w-full">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <!-- Testo -->
        <div>
          <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <i class="fas fa-brain text-blue-300"></i>
            <span class="text-blue-200 text-sm font-medium">Piattaforma per promotori editoriali</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            MATRIX<br><span class="text-blue-300">Intelligence</span>
          </h1>
          <p class="text-xl text-blue-100 leading-relaxed mb-8">
            Analisi di mercato editoriale universitario, automatizzata.<br>
            <span class="text-blue-300">Dai PDF dei programmi alle campagne di promozione.</span>
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <a href="#login-section" 
               class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-zanichelli-blue rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg">
              <i class="fas fa-sign-in-alt"></i>
              Accedi
            </a>
            <a href="#funzionalita" 
               class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-medium text-lg hover:bg-white/20 transition-colors border border-white/20">
              <i class="fas fa-arrow-down"></i>
              Scopri di piu
            </a>
          </div>
        </div>
        
        <!-- Visual: statistiche -->
        <div class="hidden md:block">
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div class="grid grid-cols-2 gap-6">
              <div class="text-center p-4">
                <div class="text-4xl font-bold text-white mb-1"><i class="fas fa-file-pdf text-blue-300 text-3xl"></i></div>
                <div class="text-blue-200 text-sm mt-2">Upload multiplo PDF</div>
              </div>
              <div class="text-center p-4">
                <div class="text-4xl font-bold text-white mb-1"><i class="fas fa-robot text-blue-300 text-3xl"></i></div>
                <div class="text-blue-200 text-sm mt-2">Analisi AI automatica</div>
              </div>
              <div class="text-center p-4">
                <div class="text-4xl font-bold text-white mb-1"><i class="fas fa-bullseye text-blue-300 text-3xl"></i></div>
                <div class="text-blue-200 text-sm mt-2">Campagne mirate</div>
              </div>
              <div class="text-center p-4">
                <div class="text-4xl font-bold text-white mb-1"><i class="fas fa-book-open text-blue-300 text-3xl"></i></div>
                <div class="text-blue-200 text-sm mt-2">Archivio Adozioni</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===================== FUNZIONALITA ===================== -->
  <section id="funzionalita" class="py-20 bg-white">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-14">
        <h2 class="text-3xl font-bold text-gray-800 mb-3">Cosa fa Matrix Intelligence</h2>
        <p class="text-gray-500 text-lg max-w-2xl mx-auto">Dalla raccolta dei programmi alla generazione delle campagne, tutto in un unico flusso</p>
      </div>
      
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Card 1: Upload -->
        <div class="feature-card bg-white rounded-xl border-2 border-gray-100 p-6 text-center">
          <div class="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-cloud-upload-alt text-zanichelli-light text-2xl"></i>
          </div>
          <h3 class="font-bold text-gray-800 mb-2">Carica i PDF</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            Upload multiplo dei programmi universitari. L'AI estrae docente, ateneo, materia, manuali citati e scenario Zanichelli.
          </p>
        </div>
        
        <!-- Card 2: Database -->
        <div class="feature-card bg-white rounded-xl border-2 border-gray-100 p-6 text-center">
          <div class="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-database text-amber-500 text-2xl"></i>
          </div>
          <h3 class="font-bold text-gray-800 mb-2">Analizza il mercato</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            Match automatico con il catalogo. Verifica le adozioni, conferma i manuali e classifica ogni cattedra per scenario.
          </p>
        </div>
        
        <!-- Card 3: Campagne -->
        <div class="feature-card bg-white rounded-xl border-2 border-gray-100 p-6 text-center">
          <div class="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-bullseye text-green-500 text-2xl"></i>
          </div>
          <h3 class="font-bold text-gray-800 mb-2">Campagne mirate</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            Pre-valutazione e analisi completa per ogni target. L'AI genera schede operative e mail personalizzate per il promotore.
          </p>
        </div>
        
        <!-- Card 4: Archivio -->
        <div class="feature-card bg-white rounded-xl border-2 border-gray-100 p-6 text-center">
          <div class="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-book-open text-indigo-500 text-2xl"></i>
          </div>
          <h3 class="font-bold text-gray-800 mb-2">Archivio Adozioni</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            Banca dati bibliografica delle adozioni. Filtra per materia, editore, ateneo. Esporta in CSV per le tue analisi.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ===================== COME FUNZIONA ===================== -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-14">
        <h2 class="text-3xl font-bold text-gray-800 mb-3">Come funziona</h2>
        <p class="text-gray-500 text-lg">Tre passaggi, dal PDF alla campagna</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Step 1 -->
        <div class="step-line text-center">
          <div class="w-16 h-16 bg-zanichelli-blue rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span class="text-2xl font-bold text-white">1</span>
          </div>
          <h3 class="font-bold text-gray-800 text-lg mb-2">Carica i programmi</h3>
          <p class="text-gray-500 text-sm leading-relaxed">
            Trascina i PDF dei programmi universitari. L'intelligenza artificiale analizza ogni documento ed estrae automaticamente tutte le informazioni rilevanti.
          </p>
        </div>
        
        <!-- Step 2 -->
        <div class="step-line text-center">
          <div class="w-16 h-16 bg-zanichelli-blue rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span class="text-2xl font-bold text-white">2</span>
          </div>
          <h3 class="font-bold text-gray-800 text-lg mb-2">Conferma i match</h3>
          <p class="text-gray-500 text-sm leading-relaxed">
            Il sistema propone un match con il catalogo per ogni manuale citato. Tu verifichi con un clic e correggi se necessario. Dati affidabili, validati dal promotore.
          </p>
        </div>
        
        <!-- Step 3 -->
        <div class="step-line text-center">
          <div class="w-16 h-16 bg-zanichelli-blue rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span class="text-2xl font-bold text-white">3</span>
          </div>
          <h3 class="font-bold text-gray-800 text-lg mb-2">Genera le campagne</h3>
          <p class="text-gray-500 text-sm leading-relaxed">
            Seleziona un volume e lancia la campagna. Per ogni docente ricevi una scheda operativa con gap, leve e una mail di primo contatto pronta da inviare.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ===================== LOGIN ===================== -->
  <section id="login-section" class="py-20 hero-gradient">
    <div class="max-w-md mx-auto px-6">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
          <i class="fas fa-brain text-3xl text-white"></i>
        </div>
        <h2 class="text-2xl font-bold text-white">Accedi a Matrix Intelligence</h2>
        <p class="text-blue-200 mt-2">Inserisci le tue credenziali per iniziare</p>
      </div>

      <!-- Card Login -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <!-- Stato configurazione -->
        <div id="config-status" class="mb-4 text-center"></div>

        <!-- Tab Login / Registrazione -->
        <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button id="tab-login" onclick="switchTab('login')" 
                  class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700">
            Accedi
          </button>
          <button id="tab-register" onclick="switchTab('register')" 
                  class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-700">
            Registrati
          </button>
        </div>

        <!-- Form Login -->
        <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4 hidden">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="email" id="login-email" required
                     class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                     placeholder="sergio@zanichelli.it">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div class="relative">
              <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="password" id="login-password" required
                     class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                     placeholder="La tua password">
            </div>
          </div>
          <button type="submit" id="login-btn"
                  class="w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-sign-in-alt"></i>
            Accedi
          </button>
        </form>

        <!-- Form Registrazione -->
        <form id="register-form" onsubmit="handleRegister(event)" class="space-y-4 hidden">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="email" id="register-email" required
                     class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                     placeholder="la-tua-email@esempio.it">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div class="relative">
              <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="password" id="register-password" required minlength="6"
                     class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                     placeholder="Minimo 6 caratteri">
            </div>
          </div>
          <button type="submit" id="register-btn"
                  class="w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-user-plus"></i>
            Crea Account
          </button>
        </form>

        <!-- Messaggi -->
        <div id="auth-message" class="mt-4 hidden"></div>
      </div>

      <p class="text-center text-blue-200 text-sm mt-6">
        MATRIX Intelligence v0.1 &mdash; Zanichelli
      </p>
    </div>
  </section>

  <!-- ===================== FOOTER ===================== -->
  <footer class="bg-zanichelli-dark py-8">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <div class="flex items-center justify-center gap-2 mb-3">
        <i class="fas fa-brain text-blue-300"></i>
        <span class="text-white font-semibold">MATRIX Intelligence</span>
      </div>
      <p class="text-blue-300/60 text-sm">
        Strumento interno per promotori editoriali Zanichelli &mdash; v0.1
      </p>
    </div>
  </footer>

  <script src="/static/js/config.js"></script>
  <script src="/static/js/auth.js"></script>
</body>
</html>`
}

// ==========================================
// TEMPLATE: Dashboard Page
// ==========================================
function dashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MATRIX Intelligence — Dashboard</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <link href="/static/css/styles.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            zanichelli: { 
              blue: '#003B7B', 
              light: '#0066CC', 
              accent: '#E8F0FE',
              dark: '#002654'
            }
          }
        }
      }
    }
  </script>
</head>
<body class="min-h-screen bg-gray-50">
  
  <!-- Sidebar -->
  <aside id="sidebar" class="fixed left-0 top-0 h-full w-64 bg-zanichelli-blue text-white shadow-xl z-50 transform -translate-x-full lg:translate-x-0 transition-transform duration-300">
    <!-- Brand -->
    <div class="p-6 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <i class="fas fa-brain text-xl"></i>
        </div>
        <div>
          <h1 class="font-bold text-lg leading-tight">MATRIX</h1>
          <p class="text-xs text-blue-200">Intelligence v0.1</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="p-4 space-y-1">
      <button onclick="navigateTo('upload')" id="nav-upload"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-cloud-upload-alt w-5 text-center"></i>
        <span>Upload Programmi</span>
      </button>
      <button onclick="navigateTo('database')" id="nav-database"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-database w-5 text-center"></i>
        <span>Database Programmi</span>
      </button>
      <button onclick="navigateTo('campagne')" id="nav-campagne"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-bullseye w-5 text-center"></i>
        <span>Campagne</span>
      </button>
      <button onclick="navigateTo('archivio')" id="nav-archivio"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-book-open w-5 text-center"></i>
        <span>Archivio Adozioni</span>
      </button>
      <button onclick="navigateTo('impostazioni')" id="nav-impostazioni"
              class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10 text-blue-200">
        <i class="fas fa-cog w-5 text-center"></i>
        <span>Impostazioni</span>
      </button>
    </nav>

    <!-- User -->
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p id="user-email" class="text-sm truncate">utente@email.it</p>
        </div>
        <button onclick="handleLogout()" class="text-blue-200 hover:text-white transition-colors" title="Logout">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile Header -->
  <header class="lg:hidden fixed top-0 left-0 right-0 bg-zanichelli-blue text-white p-4 z-40 flex items-center gap-4 shadow-lg">
    <button onclick="toggleSidebar()" class="text-xl">
      <i class="fas fa-bars"></i>
    </button>
    <h1 class="font-bold">MATRIX Intelligence</h1>
  </header>

  <!-- Main Content -->
  <main class="lg:ml-64 min-h-screen pt-4 lg:pt-0">
    <div class="p-4 lg:p-8 mt-14 lg:mt-0">

      <!-- ===================== SEZIONE UPLOAD ===================== -->
      <section id="section-upload" class="section hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-cloud-upload-alt text-zanichelli-light mr-2"></i>
            Upload Programmi
          </h2>
          <p class="text-gray-500 mt-1">Carica i PDF dei programmi universitari per l'analisi automatica</p>
        </div>

        <!-- Drop Zone -->
        <div id="drop-zone" 
             class="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-zanichelli-light hover:bg-zanichelli-accent/30 transition-all"
             ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)" onclick="document.getElementById('file-input').click()">
          <i class="fas fa-file-pdf text-5xl text-gray-300 mb-4"></i>
          <p class="text-lg font-medium text-gray-600">Trascina qui i PDF dei programmi</p>
          <p class="text-sm text-gray-400 mt-1">oppure clicca per selezionare i file</p>
          <input type="file" id="file-input" accept=".pdf" multiple class="hidden" onchange="handleFileSelect(event)">
        </div>

        <!-- File Queue -->
        <div id="file-queue" class="mt-6 hidden">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-700">File selezionati</h3>
            <div class="flex gap-2">
              <span id="queue-count" class="text-sm text-gray-500"></span>
              <button onclick="clearQueue()" class="text-sm text-red-500 hover:text-red-700">
                <i class="fas fa-trash-alt mr-1"></i>Svuota
              </button>
            </div>
          </div>
          <div id="file-list" class="space-y-2 max-h-60 overflow-y-auto"></div>
          
          <!-- Preview testo estratto -->
          <div id="text-preview-container" class="mt-4 hidden">
            <h4 class="font-medium text-gray-700 mb-2">
              <i class="fas fa-eye mr-1"></i>Anteprima testo estratto
            </h4>
            <div id="text-preview" class="bg-gray-50 border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-600 font-mono"></div>
          </div>

          <button onclick="startProcessing()" id="btn-start-processing"
                  class="mt-4 w-full py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-play"></i>
            Avvia Analisi
          </button>
        </div>

        <!-- Progress -->
        <div id="processing-progress" class="mt-6 hidden">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 id="progress-title" class="font-semibold text-gray-700">Analisi in corso...</h3>
              <span id="progress-text" class="text-sm font-medium text-zanichelli-light">0/0</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div id="progress-bar" class="bg-zanichelli-light h-3 rounded-full" style="width: 0%"></div>
            </div>
            <p id="progress-detail" class="text-sm text-gray-500 mt-2"></p>
          </div>
        </div>

        <!-- Results Summary -->
        <div id="upload-results" class="mt-6 hidden">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-700 mb-4">
              <i class="fas fa-check-circle text-green-500 mr-2"></i>Risultati Analisi
            </h3>
            <div class="grid grid-cols-3 gap-4 mb-4">
              <div class="text-center p-4 bg-green-50 rounded-lg">
                <p id="result-success" class="text-2xl font-bold text-green-600">0</p>
                <p class="text-sm text-green-700">Completati</p>
              </div>
              <div class="text-center p-4 bg-red-50 rounded-lg">
                <p id="result-errors" class="text-2xl font-bold text-red-600">0</p>
                <p class="text-sm text-red-700">Errori</p>
              </div>
              <div class="text-center p-4 bg-yellow-50 rounded-lg">
                <p id="result-skipped" class="text-2xl font-bold text-yellow-600">0</p>
                <p class="text-sm text-yellow-700">Saltati</p>
              </div>
            </div>
            <div id="result-details" class="space-y-2 max-h-60 overflow-y-auto"></div>
            <button onclick="navigateTo('database')" class="mt-4 w-full py-2 bg-zanichelli-accent text-zanichelli-blue rounded-lg font-medium hover:bg-blue-100 transition-colors">
              <i class="fas fa-database mr-2"></i>Vai al Database
            </button>
          </div>
        </div>
      </section>

      <!-- ===================== SEZIONE DATABASE ===================== -->
      <section id="section-database" class="section hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-database text-zanichelli-light mr-2"></i>
            Database Programmi
          </h2>
          <p class="text-gray-500 mt-1">Consulta, verifica i match e filtra i programmi analizzati</p>
        </div>

        <!-- Banner validazione match -->
        <div id="validation-banner" class="mb-4 hidden"></div>

        <!-- Filtri -->
        <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Cerca</label>
              <div class="relative">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="text" id="filter-search" placeholder="Docente, ateneo, materia..."
                       class="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light focus:border-transparent outline-none"
                       oninput="applyFilters()">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Materia</label>
              <select id="filter-materia" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyFilters()">
                <option value="">Tutte le materie</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Ateneo</label>
              <select id="filter-ateneo" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyFilters()">
                <option value="">Tutti gli atenei</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Scenario</label>
              <select id="filter-scenario" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyFilters()">
                <option value="">Tutti gli scenari</option>
                <option value="zanichelli_principale">Zanichelli Principale</option>
                <option value="zanichelli_alternativo">Zanichelli Alternativo</option>
                <option value="zanichelli_assente">Zanichelli Assente</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-between mt-3 pt-3 border-t">
            <span id="db-count" class="text-sm text-gray-500">0 programmi trovati</span>
            <button onclick="resetFilters()" class="text-sm text-zanichelli-light hover:text-zanichelli-blue">
              <i class="fas fa-undo mr-1"></i>Reset filtri
            </button>
          </div>
        </div>

        <!-- Vista ad albero: Materia → Ateneo → Classe -->
        <div id="db-tree-view" class="space-y-3">
          <div class="text-center text-gray-400 py-12">
            <i class="fas fa-inbox text-3xl mb-2 block"></i>
            Nessun programma trovato. Carica dei PDF dalla sezione Upload.
          </div>
        </div>

        <!-- Modale condivisa -->
      </section>

      <!-- ===================== SEZIONE CAMPAGNE ===================== -->
      <section id="section-campagne" class="section hidden">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-bullseye text-zanichelli-light mr-2"></i>
              Campagne
            </h2>
            <p class="text-gray-500 mt-1">Crea campagne promozionali e genera liste target</p>
          </div>
          <button onclick="showNewCampaignForm()" id="btn-new-campaign"
                  class="px-4 py-2 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center gap-2">
            <i class="fas fa-plus"></i>
            Nuova Campagna
          </button>
        </div>

        <!-- Lista campagne esistenti -->
        <div id="campaigns-list" class="space-y-4">
          <div class="text-center py-12 text-gray-400">
            <i class="fas fa-bullseye text-4xl mb-3 block"></i>
            <p>Nessuna campagna creata</p>
            <p class="text-sm mt-1">Crea la tua prima campagna per generare liste target</p>
          </div>
        </div>

        <!-- Form nuova campagna (nascosto) -->
        <div id="campaign-form-container" class="hidden mt-6">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-1">
              <i class="fas fa-bullhorn mr-2 text-zanichelli-light"></i>
              Nuova Campagna Promozionale
            </h3>
            <p class="text-sm text-gray-500 mb-5">Inserisci i dati del volume che vuoi promuovere presso i docenti</p>

            <form id="campaign-form" onsubmit="handleCreateCampaign(event)" class="space-y-5">

              <!-- ====== SEZIONE 1: VOLUME DA PROMUOVERE ====== -->
              <div class="space-y-4">
                <div class="flex items-center gap-2 mb-1">
                  <span class="flex items-center justify-center w-6 h-6 bg-zanichelli-blue text-white rounded-full text-xs font-bold">1</span>
                  <h4 class="font-semibold text-gray-800">Volume da promuovere</h4>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Titolo del volume *</label>
                    <input type="text" id="camp-titolo" required
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none"
                           placeholder="Es: Chimica Generale e Inorganica">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Autore/i</label>
                    <input type="text" id="camp-autore"
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none"
                           placeholder="Es: Petrucci, Harwood, Herring">
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Materia di riferimento *</label>
                    <input type="text" id="camp-materia" required oninput="onMateriaChange()"
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none"
                           placeholder="Es: Chimica Generale">
                    <p class="text-xs text-gray-400 mt-1">Usata per cercare i docenti target nel database programmi</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Editore</label>
                    <input type="text" id="camp-editore" value="Zanichelli"
                           class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
                  </div>
                </div>

                <!-- Pannello Scenario A/B/C (appare automaticamente quando si inserisce la materia) -->
                <div id="scenario-panel" class="hidden"></div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-sm font-medium text-gray-700">
                      Indice / Sommario del volume
                      <span id="indice-source-badge" class="hidden ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        <i class="fas fa-magic mr-1"></i>importato dal catalogo
                      </span>
                    </label>
                    <button type="button" onclick="toggleCatalogImport()" id="btn-import-catalog"
                            class="text-xs text-zanichelli-light hover:text-zanichelli-blue font-medium transition-colors">
                      <i class="fas fa-book-open mr-1"></i>Importa dal catalogo MATRIX
                    </button>
                  </div>
                  <textarea id="camp-indice" rows="5"
                            class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm"
                            placeholder="Incolla qui l'indice del libro (capitoli principali). L'indice migliora la qualita delle motivazioni generate per ogni docente target."></textarea>
                </div>

                <!-- === CATALOGO MATRIX (collassabile, nascosto di default) === -->
                <div id="catalog-import-panel" class="hidden">
                  <div class="bg-zanichelli-accent rounded-xl p-4 border border-blue-200">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <i class="fas fa-book-open text-zanichelli-blue"></i>
                        <h5 class="font-semibold text-zanichelli-blue text-sm">Importa indice dal Catalogo MATRIX</h5>
                        <span id="catalog-count" class="text-xs bg-zanichelli-blue text-white px-2 py-0.5 rounded-full">0 manuali</span>
                      </div>
                      <button type="button" onclick="toggleCatalogImport()" class="text-xs text-zanichelli-blue/60 hover:text-zanichelli-blue">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                    <p class="text-xs text-zanichelli-blue/70 mb-3">
                      Se il volume e gia nel catalogo, selezionalo per importare automaticamente l'indice dei capitoli.
                      I campi titolo, autore, materia ed editore si compileranno automaticamente.
                    </p>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-zanichelli-blue/80 mb-1">Materia</label>
                        <select id="catalog-subject-filter" onchange="filterCatalogManuals()"
                                class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                          <option value="">Tutte le materie</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-zanichelli-blue/80 mb-1">Editore</label>
                        <select id="catalog-publisher-filter" onchange="filterCatalogManuals()"
                                class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                          <option value="">Tutti gli editori</option>
                          <option value="zanichelli">Solo Zanichelli</option>
                          <option value="competitor">Solo concorrenti</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-zanichelli-blue/80 mb-1">Manuale</label>
                        <select id="catalog-manual-select" onchange="selectManualFromCatalog()"
                                class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                          <option value="">— Seleziona un manuale —</option>
                        </select>
                      </div>
                    </div>

                    <div class="mt-3">
                      <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm"></i>
                        <input type="text" id="catalog-search" placeholder="Cerca per titolo o autore..." oninput="filterCatalogManuals()"
                               class="w-full pl-9 pr-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zanichelli-light outline-none">
                      </div>
                    </div>

                    <div id="catalog-selected-info" class="hidden mt-3 bg-white rounded-lg p-3 border border-blue-200">
                      <div class="flex items-center justify-between">
                        <div>
                          <span id="catalog-selected-title" class="font-medium text-gray-800"></span>
                          <span id="catalog-selected-meta" class="text-xs text-gray-500 ml-2"></span>
                        </div>
                        <button type="button" onclick="clearCatalogSelection()" class="text-xs text-red-500 hover:text-red-700">
                          <i class="fas fa-times mr-1"></i>Rimuovi
                        </button>
                      </div>
                      <div id="catalog-selected-chapters" class="text-xs text-gray-500 mt-1"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Temi chiave (opzionale)</label>
                  <input type="text" id="camp-temi"
                         class="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm"
                         placeholder="Generati automaticamente dall'indice, oppure inseriscili a mano separati da virgola">
                </div>
              </div>

              <!-- ====== SEZIONE 2: AZIONI ====== -->
              <div class="border-t pt-5">
                <div class="flex items-center gap-2 mb-4">
                  <span class="flex items-center justify-center w-6 h-6 bg-zanichelli-blue text-white rounded-full text-xs font-bold">2</span>
                  <h4 class="font-semibold text-gray-800">Genera lista target</h4>
                  <span class="text-xs text-gray-400 ml-1">I docenti target verranno estratti dal database programmi</span>
                </div>
                <div class="flex gap-3">
                  <button type="submit"
                          class="flex-1 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors flex items-center justify-center gap-2">
                    <i class="fas fa-rocket"></i>
                    Crea Campagna e Genera Target
                  </button>
                  <button type="button" onclick="hideCampaignForm()"
                          class="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    Annulla
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>

        <!-- Target Results (nascosto) -->
        <div id="target-results-container" class="hidden mt-6">
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-800">
                <i class="fas fa-list-ol mr-2 text-zanichelli-light"></i>
                Lista Target — <span id="target-campaign-title"></span>
              </h3>
              <div class="flex items-center gap-2">
                <button onclick="exportTargetCSV()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                  <i class="fas fa-file-csv"></i>
                  Esporta CSV
                </button>
                <button onclick="document.getElementById('target-results-container').classList.add('hidden')" class="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <i class="fas fa-times"></i>
                  Chiudi
                </button>
              </div>
            </div>

            <!-- Progress generazione target -->
            <div id="target-progress" class="mb-4 hidden">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-gray-600">Generazione motivazioni...</span>
                <span id="target-progress-text" class="text-sm font-medium text-zanichelli-light">0/0</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="target-progress-bar" class="bg-zanichelli-light h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
            </div>

            <!-- Summary badges -->
            <div class="flex gap-3 mb-4">
              <span id="target-alta" class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Alta: 0
              </span>
              <span id="target-media" class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                Media: 0
              </span>
              <span id="target-bassa" class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                Bassa: 0
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th class="px-4 py-3 font-medium w-8">#</th>
                    <th class="px-4 py-3 font-medium">Docente</th>
                    <th class="px-4 py-3 font-medium">Ateneo</th>
                    <th class="px-4 py-3 font-medium">Materia</th>
                    <th class="px-4 py-3 font-medium">Scenario</th>
                    <th class="px-4 py-3 font-medium">
                      Rilevanza
                      <div class="text-[10px] font-normal text-gray-400 mt-0.5">
                        <span title="Overlap tematico: % di temi in comune tra il programma del docente e i contenuti di riferimento (volume o framework). Piu e alto, piu il programma e allineato.">📊 Overlap = allineamento temi</span>
                        &middot;
                        <span title="Framework Score: % dei moduli del framework disciplinare MATRIX coperti dal programma del docente. Indica quanto il corso e completo rispetto allo standard della materia.">📐 FW = copertura framework</span>
                      </div>
                    </th>
                    <th class="px-4 py-3 font-medium">Motivazione</th>
                    <th class="px-4 py-3 font-medium text-center">Mail</th>
                  </tr>
                </thead>
                <tbody id="target-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================== SEZIONE ARCHIVIO ADOZIONI ===================== -->
      <section id="section-archivio" class="section hidden">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-book-open text-zanichelli-light mr-2"></i>
              Archivio Adozioni
            </h2>
            <p class="text-gray-500 mt-1">Banca dati bibliografica delle adozioni universitarie</p>
          </div>
          <div class="flex gap-2">
            <button onclick="exportArchivioCSV()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              <i class="fas fa-file-csv mr-1"></i>Esporta CSV
            </button>
          </div>
        </div>

        <!-- Statistiche rapide -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div id="arch-stat-programmi" class="text-2xl font-bold text-zanichelli-blue">0</div>
            <div class="text-xs text-gray-500 mt-1">Programmi archiviati</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div id="arch-stat-atenei" class="text-2xl font-bold text-indigo-600">0</div>
            <div class="text-xs text-gray-500 mt-1">Atenei</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div id="arch-stat-manuali" class="text-2xl font-bold text-amber-600">0</div>
            <div class="text-xs text-gray-500 mt-1">Manuali censiti</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div id="arch-stat-editori" class="text-2xl font-bold text-green-600">0</div>
            <div class="text-xs text-gray-500 mt-1">Editori</div>
          </div>
        </div>

        <!-- Filtri di Ricerca -->
        <div class="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-700">
              <i class="fas fa-search text-zanichelli-light mr-2"></i>Filtri di Ricerca
            </h3>
            <button onclick="resetArchivioFilters()" class="text-sm text-gray-400 hover:text-gray-600">
              <i class="fas fa-times mr-1"></i>Cancella Filtri
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Materia Standardizzata</label>
              <select id="arch-filter-materia" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyArchivioFilters()">
                <option value="">Seleziona materia...</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Ateneo</label>
              <input type="text" id="arch-filter-ateneo" placeholder="es. Università di Bologna"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Corso di Laurea</label>
              <input type="text" id="arch-filter-corso" placeholder="es. Biotecnologie"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Classe di Laurea</label>
              <select id="arch-filter-classe" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none" onchange="applyArchivioFilters()">
                <option value="">Seleziona classe di laurea...</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Docente</label>
              <input type="text" id="arch-filter-docente" placeholder="es. Mario Rossi"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Insegnamento</label>
              <input type="text" id="arch-filter-insegnamento" placeholder="es. Chimica Generale"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Titolo Libro</label>
              <input type="text" id="arch-filter-titolo" placeholder="es. Fondamenti di Chimica"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Autore Libro</label>
              <input type="text" id="arch-filter-autore" placeholder="es. Brown"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Editore Libro</label>
              <input type="text" id="arch-filter-editore" placeholder="es. EdiSES, Zanichelli"
                     class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zanichelli-light outline-none"
                     oninput="applyArchivioFilters()">
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="arch-filter-principali" class="w-4 h-4 rounded border-gray-300 text-zanichelli-blue focus:ring-zanichelli-light" onchange="applyArchivioFilters()">
                <span class="text-sm text-gray-600">Cerca solo tra i testi principali</span>
              </label>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t">
            <button onclick="applyArchivioFilters()" class="w-full py-2.5 bg-zanichelli-blue text-white rounded-lg text-sm font-medium hover:bg-zanichelli-dark transition-colors">
              <i class="fas fa-search mr-2"></i>Applica Filtri
            </button>
          </div>
        </div>

        <!-- Contatore risultati -->
        <div class="flex items-center justify-between mb-3">
          <span id="arch-count" class="text-sm text-gray-500">0 programmi trovati</span>
        </div>

        <!-- Tabella Archivio -->
        <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th class="px-4 py-3 font-medium">Ateneo</th>
                  <th class="px-4 py-3 font-medium">Classe</th>
                  <th class="px-4 py-3 font-medium">Corso</th>
                  <th class="px-4 py-3 font-medium">Insegnamento</th>
                  <th class="px-4 py-3 font-medium">Docente</th>
                  <th class="px-4 py-3 font-medium">Libri</th>
                </tr>
              </thead>
              <tbody id="arch-table-body">
                <tr>
                  <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                    <i class="fas fa-book-open text-3xl mb-2 block"></i>
                    Nessuna adozione archiviata. Conferma i match nel Database e usa "Archivia tutti i confermati".
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ===================== SEZIONE IMPOSTAZIONI ===================== -->
      <section id="section-impostazioni" class="section hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-cog text-zanichelli-light mr-2"></i>
            Impostazioni
          </h2>
          <p class="text-gray-500 mt-1">Configura la tua API Key e le preferenze</p>
        </div>

        <div class="max-w-2xl space-y-6">
          <!-- API Key -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-key mr-2 text-zanichelli-light"></i>
              API Key OpenAI
            </h3>
            <p class="text-sm text-gray-500 mb-4">La chiave viene salvata solo nel tuo browser (localStorage). Non viene mai inviata al server.</p>
            <div class="flex gap-3">
              <div class="relative flex-1">
                <input type="password" id="settings-apikey" 
                       class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none font-mono text-sm"
                       placeholder="sk-...">
                <button onclick="toggleApiKeyVisibility()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i id="apikey-eye-icon" class="fas fa-eye"></i>
                </button>
              </div>
              <button onclick="saveApiKey()" class="px-6 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
                <i class="fas fa-save mr-1"></i>
                Salva
              </button>
            </div>
            <div id="apikey-status" class="mt-2 text-sm"></div>
          </div>

          <!-- Modello LLM -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-robot mr-2 text-zanichelli-light"></i>
              Modello LLM
            </h3>
            <p class="text-sm text-gray-500 mb-4">Seleziona il modello OpenAI da utilizzare per le analisi</p>
            <select id="settings-model" onchange="saveModel()" 
                    class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none">
              <option value="gpt-4o-mini">GPT-4o Mini (consigliato — veloce e economico)</option>
              <option value="gpt-4o">GPT-4o (più preciso, più costoso)</option>
              <option value="gpt-4.1-mini">GPT-4.1 Mini (ultimo modello economico)</option>
              <option value="gpt-4.1">GPT-4.1 (ultimo modello avanzato)</option>
            </select>
          </div>

          <!-- Connessione Supabase -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-database mr-2 text-zanichelli-light"></i>
              Connessione Supabase
            </h3>
            <p class="text-sm text-gray-500 mb-4">Configura i dettagli della tua istanza Supabase</p>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">URL del progetto</label>
                <input type="text" id="settings-supabase-url"
                       class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm font-mono"
                       placeholder="https://xxxxx.supabase.co">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Anon Key</label>
                <input type="text" id="settings-supabase-key"
                       class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-zanichelli-light outline-none text-sm font-mono"
                       placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
              </div>
              <button onclick="saveSupabaseConfig()" 
                      class="px-6 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
                <i class="fas fa-save mr-1"></i>
                Salva Configurazione
              </button>
              <div id="supabase-status" class="text-sm"></div>
            </div>
          </div>

          <!-- Sincronizzazione Matrix -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-800 mb-1">
              <i class="fas fa-sync mr-2 text-zanichelli-light"></i>
              Sincronizzazione dati Matrix
            </h3>
            <p class="text-sm text-gray-500 mb-4">Importa framework di valutazione e catalogo manuali da Matrix (GitHub). La prima sincronizzazione scarica tutti i dati; le successive scaricano solo le modifiche.</p>
            
            <div id="sync-last-info" class="text-xs text-gray-400 mb-3"></div>
            
            <button onclick="syncFromMatrix()" id="sync-btn"
                    class="px-6 py-3 bg-zanichelli-blue text-white rounded-lg font-medium hover:bg-zanichelli-dark transition-colors">
              <i class="fas fa-sync mr-2"></i>
              Sincronizza da Matrix
            </button>
            <button onclick="forceSyncFromMatrix()" 
                    class="ml-3 px-4 py-3 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Cancella i dati locali e riscarica tutto da Matrix">
              <i class="fas fa-redo mr-1"></i>
              Forza completa
            </button>
            
            <div id="sync-status" class="mt-4 text-sm"></div>
            
            <div id="sync-progress" class="mt-3 hidden">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="sync-progress-bar" class="bg-zanichelli-blue h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <p id="sync-progress-text" class="text-xs text-gray-500 mt-1"></p>
            </div>
            
            <div id="sync-detail" class="mt-2"></div>
          </div>

          <!-- Info -->
          <div class="bg-zanichelli-accent rounded-xl p-6">
            <h3 class="font-semibold text-zanichelli-blue mb-2">
              <i class="fas fa-info-circle mr-2"></i>
              Informazioni
            </h3>
            <ul class="text-sm text-zanichelli-blue/80 space-y-1">
              <li><strong>Versione:</strong> MVP v0.1</li>
              <li><strong>Compatibilità:</strong> Chrome, Firefox, Safari, Edge</li>
              <li><strong>Dati:</strong> I tuoi dati sono salvati su Supabase (tuo account)</li>
              <li><strong>API Key:</strong> Salvata solo nel browser, mai sul server</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- Modal Dettaglio Programma -->
  <div id="modal-overlay" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4" onclick="closeModal(event)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
        <h3 class="text-lg font-semibold text-gray-800">
          <i class="fas fa-id-card mr-2 text-zanichelli-light"></i>
          Dettaglio Programma
        </h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div id="modal-content" class="p-6"></div>
    </div>
  </div>

  <!-- Notification Toast -->
  <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>

  <!-- Scripts -->
  <script src="/static/js/config.js"></script>
  <script src="/static/js/utils.js"></script>
  <script src="/static/js/auth.js"></script>
  <script src="/static/js/llm.js"></script>
  <script src="/static/js/upload.js"></script>
  <script src="/static/js/database.js"></script>
  <script src="/static/js/archivio.js"></script>
  <script src="/static/js/campagna.js"></script>
  <script src="/static/js/sync.js"></script>
</body>
</html>`
}
