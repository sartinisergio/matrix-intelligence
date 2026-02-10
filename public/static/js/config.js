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
  
  // Autori Zanichelli noti (per scenario classification)
  ZANICHELLI_AUTHORS: [
    'atkins', 'jones', 'bertini', 'luchinat', 'mani', 'zanello',
    'silberberg', 'amateis', 'brown', 'iverson', 'anslyn', 'petrucci',
    'herring', 'madura', 'bissonnette', 'kotz', 'treichel', 'townsend',
    'purves', 'sadava', 'hillis', 'heller', 'solomon', 'martin',
    'berg', 'tymoczko', 'gatto', 'stryer', 'nelson', 'cox', 'lehninger',
    'campbell', 'reece', 'urry', 'cain', 'wasserman', 'minorsky',
    'jackson', 'halliday', 'resnick', 'walker', 'mazzoldi', 'nigro',
    'voci', 'giancoli', 'serway', 'jewett', 'amaldi', 'bianchi',
    'dispensatori', 'vicentini', 'pession', 'ruffo', 'lanotte',
    'zanichelli', 'giusti', 'speranza', 'de lillo', 'marro',
    'lamberti', 'meiani', 'rizzoni', 'montanari', 'rugarli'
  ]
};

// Variabile globale per il client Supabase
let supabase = null;

// Inizializza Supabase se configurato
function initSupabase() {
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    try {
      supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      return true;
    } catch (e) {
      console.error('Errore inizializzazione Supabase:', e);
      return false;
    }
  }
  return false;
}
