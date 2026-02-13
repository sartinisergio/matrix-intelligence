// ==========================================
// MATRIX Intelligence — Configurazione
// ==========================================

const CONFIG = {
  // Supabase - configurabile dall'utente nelle impostazioni
  get SUPABASE_URL() {
    return localStorage.getItem('matrix_supabase_url') || '';
  },
  get SUPABASE_ANON_KEY() {
    return localStorage.getItem('matrix_supabase_key') || '';
  },
  
  // OpenAI
  get OPENAI_API_KEY() {
    return localStorage.getItem('matrix_openai_key') || '';
  },
  get LLM_MODEL() {
    return localStorage.getItem('matrix_llm_model') || 'gpt-4o-mini';
  },
  
  // Costanti applicazione
  APP_NAME: 'MATRIX Intelligence',
  APP_VERSION: '0.1.0',
  
  // Rate limiting
  BATCH_DELAY_MS: 2000, // 2 secondi tra le chiamate LLM
  
  // Autori Zanichelli noti (legacy - mantenuto per compatibilità)
  ZANICHELLI_AUTHORS: [
    'atkins', 'mcquarrie', 'manotti', 'tiripicchio', 'solomons',
    'vollhardt', 'mcmurry', 'hart', 'krugman', 'wells', 'brue',
    'mcconnell', 'flynn', 'mankiw', 'alessandrini', 'giancoli',
    'contessa', 'marzo', 'halliday', 'resnick', 'walker', 'pawlina', 'ross'
  ],
  
  // Catalogo ufficiale manuali Zanichelli (autore + titolo + materia)
  // Usato dal prompt LLM e dalla validazione post-LLM per identificare correttamente
  // se un manuale citato in un programma è pubblicato da Zanichelli
  ZANICHELLI_CATALOG: [
    // Chimica Generale
    { author: 'Atkins', title: 'Chimica generale', subject: 'Chimica Generale' },
    { author: 'McQuarrie', title: 'Chimica generale', subject: 'Chimica Generale' },
    { author: 'Atkins', title: 'Fondamenti di Chimica', subject: 'Chimica Generale' },
    { author: 'Manotti Lanfredi, Tiripicchio', title: 'Fondamenti di chimica', subject: 'Chimica Generale' },
    { author: 'Atkins', title: 'Principi di Chimica', subject: 'Chimica Generale' },
    // Chimica Organica
    { author: 'Solomons', title: 'Chimica organica', subject: 'Chimica Organica' },
    { author: 'Vollhardt', title: 'Chimica organica', subject: 'Chimica Organica' },
    { author: 'McMurry', title: 'Chimica organica', subject: 'Chimica Organica' },
    { author: 'Hart', title: 'Fondamenti di chimica organica', subject: 'Chimica Organica' },
    { author: 'McMurry', title: 'Fondamenti di chimica organica', subject: 'Chimica Organica' },
    // Economia Politica
    { author: 'Krugman, Wells', title: 'Essenziale di Economia', subject: 'Economia Politica' },
    { author: 'Brue, McConnell, Flynn', title: "L'essenziale di Economia", subject: 'Economia Politica' },
    { author: 'Mankiw', title: "L'essenziale di Economia", subject: 'Economia Politica' },
    { author: 'Mankiw', title: 'Principi di Economia', subject: 'Economia Politica' },
    // Fisica
    { author: 'Alessandrini', title: 'Fisica', subject: 'Fisica' },
    { author: 'Giancoli', title: 'Fisica', subject: 'Fisica' },
    { author: 'Contessa, Marzo', title: 'Fisica applicata alle scienze biomediche', subject: 'Fisica' },
    { author: 'Giancoli', title: 'Fisica con fisica moderna', subject: 'Fisica' },
    { author: 'Halliday, Resnick, Walker', title: 'Fondamenti di Fisica', subject: 'Fisica' },
    // Istologia
    { author: 'Pawlina, Ross', title: 'Istologia', subject: 'Istologia' }
  ]
};

// Variabile globale per il client Supabase
let supabaseClient = null;

// Inizializza Supabase se configurato
function initSupabase() {
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    try {
      // window.supabase è la libreria CDN @supabase/supabase-js
      const { createClient } = window.supabase;
      supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      console.log('Supabase inizializzato con successo');
      return true;
    } catch (e) {
      console.error('Errore inizializzazione Supabase:', e);
      return false;
    }
  }
  return false;
}
