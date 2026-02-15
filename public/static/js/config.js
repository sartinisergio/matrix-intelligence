// ==========================================
// MATRIX Intelligence — Configurazione
// ==========================================

const CONFIG = {
  // Supabase - credenziali pre-configurate (anon key è pubblica, sicurezza garantita da RLS)
  SUPABASE_URL: 'https://umutrwocaqhfypophylu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtdXRyd29jYXFoZnlwb3BoeWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTc3NTcsImV4cCI6MjA4NjI5Mzc1N30.dXoQXAXhkKr5atqGxy8UGWfbHKVLpikqJ8G4oM_4BwE',
  
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
};

// NOTE: ZANICHELLI_AUTHORS e ZANICHELLI_CATALOG sono stati rimossi.
// L'identificazione dei manuali Zanichelli avviene dinamicamente
// dal catalogo sincronizzato da Matrix (variabile globale catalogManuals).
// Usare getZanichelliFromCatalog() per ottenere la lista aggiornata.

// --- Funzione globale: estrai manuali Zanichelli dal catalogo sincronizzato ---
// Legge dalla variabile globale catalogManuals (definita in campagna.js)
// Restituisce array di { author, title, subject, publisher }
function getZanichelliFromCatalog() {
  // catalogManuals è la variabile globale caricata da campagna.js
  // (da localStorage sync oppure dal file statico)
  if (typeof catalogManuals === 'undefined' || !Array.isArray(catalogManuals) || catalogManuals.length === 0) {
    console.warn('[Config] catalogManuals non disponibile, impossibile identificare Zanichelli');
    return [];
  }
  
  return catalogManuals.filter(m => {
    // Compatibilità: supporta sia formato Matrix (type) che Intelligence (is_zanichelli)
    // Dopo sincronizzazione da Matrix: type === 'zanichelli'
    // File statico locale: is_zanichelli === true
    // Fallback: publisher è Zanichelli o un marchio del gruppo Zanichelli
    if (m.type === 'zanichelli') return true;
    if (m.is_zanichelli === true) return true;
    // CEA (Casa Editrice Ambrosiana) è un marchio del gruppo Zanichelli
    const pub = (m.publisher || '').toLowerCase();
    if (pub === 'zanichelli' || pub === 'cea' || pub.includes('ambrosiana')) return true;
    return false;
  }).map(m => ({
    author: m.author || '',
    title: m.title || '',
    subject: m.subject || '',
    publisher: m.publisher || 'Zanichelli'
  }));
}

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
