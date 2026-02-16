# MATRIX Intelligence

Piattaforma AI di intelligence commerciale per promotori editoriali universitari.  
Analizza programmi d'esame, identifica adozioni e docenti target, genera campagne promozionali personalizzate con email pronte da inviare.

## URL

| Ambiente | URL |
|----------|-----|
| **Produzione** | https://matrix-intelligence.netlify.app |
| **GitHub** | https://github.com/sartinisergio/matrix-intelligence |
| **Matrix (dati sorgente)** | https://github.com/sartinisergio/matrix-analisi-programmi |

## Funzionalita implementate

### 1. Upload & Analisi PDF
- Drag & drop multiplo di programmi universitari
- Estrazione testo client-side con PDF.js
- Pre-classificazione automatica via LLM (OpenAI): docente, ateneo, materia, manuali citati, scenario Zanichelli
- Salvataggio su Supabase (tabella `programmi`)

### 2. Staging & Validazione
- Area intermedia per verifica dati estratti dall'AI
- Il promotore puo correggere, approvare o rifiutare ogni programma
- Promozione al database definitivo dopo validazione

### 3. Database Programmi & Match
- Consultazione con filtri: ricerca testuale, materia, ateneo, scenario Zanichelli
- Vista ad albero: Materia -> Ateneo -> Classe di laurea
- Match automatico con catalogo di 85+ manuali
- Conferma match manuale con un clic
- Badge scenario colorati (Principale/Alternativo/Assente)
- Modifica ed eliminazione inline

### 4. Campagne AI — Intelligence a 2 fasi

**Fase 1 — Pre-valutazione** (il volume non esiste ancora):
- Crea campagna con titolo volume + materia
- Genera target con matching materia + scenario
- L'LLM incrocia temi del programma, indice del concorrente e framework disciplinare
- Produce schede operative: SITUAZIONE / LEVE / COLLOQUIO
- Badge blu "Pre-valutazione"

**Fase 2 — Analisi completa** (il volume esiste):
- Aggiungi indice/sommario del volume
- Estrazione temi chiave via LLM
- Rigenera motivazioni con confronto diretto volume vs concorrente
- Badge verde "Completa"

**Pannello Scenario A/B/C:**
- A (Verde): Framework + Manuali -> analisi qualitativa completa
- B (Giallo): Solo framework o solo manuali -> analisi parziale
- C (Arancione): Nessuna risorsa -> matching basico

**Indicatori target:**
- **Overlap %**: allineamento tematico tra programma docente e contenuti di riferimento
- **FW %**: copertura del framework disciplinare MATRIX

### 5. Email personalizzate

3 template differenziati per scenario:
- **Conquista** (Zanichelli assente): proposta nuovo volume come alternativa
- **Aggiornamento** (Zanichelli principale): presentazione novita del catalogo
- **Upgrade** (Zanichelli alternativo): promozione a testo principale

Funzionalita: oggetto editabile, link anteprima, placeholder corso di laurea, firma persistente, "Copia tutto" e "Apri in Mail".

### 6. Archivio Adozioni
- Banca dati bibliografica completa delle adozioni universitarie
- Filtri: materia, ateneo, corso di laurea, classe, docente, insegnamento, titolo, autore, editore
- Statistiche rapide: programmi, atenei, manuali, editori
- Esportazione CSV

### 7. Gestione (ruolo Gestore)
- Upload framework di valutazione condivisi (JSON)
- Upload catalogo manuali condiviso (JSON)
- Import massivo da Matrix locale a Supabase condiviso
- Promozione/declassamento utenti (gestore/promotore)
- Sezione visibile solo al ruolo `gestore`

### 8. Sincronizzazione dati Matrix
- Fonte dati: repository GitHub Matrix
- Sincronizzazione incrementale (scarica solo le differenze)
- 85+ manuali individuali con indice capitoli
- 21 framework disciplinari con moduli e concetti chiave
- Bottone "Forza completa" per reset e risincronizzazione

### 9. Impostazioni
- API Key OpenAI (salvata in localStorage, mai sul server)
- Scelta modello LLM (gpt-4o-mini consigliato, gpt-4o, gpt-4.1-mini, gpt-4.1)
- Configurazione Supabase (URL + anon key)
- Pannello ruolo utente con auto-promozione a gestore
- Sincronizzazione dati Matrix

## Architettura

### Supabase (tabelle)
| Tabella | Descrizione |
|---------|-------------|
| `programmi` | Programmi universitari (docente, ateneo, materia, manuali_citati, scenario, temi) |
| `campagne` | Campagne (libro, materia, indice, temi, target, stato) |
| `profili` | Profili utente con ruolo (promotore/gestore) |
| `frameworks_condivisi` | Framework disciplinari condivisi tra utenti |
| `catalogo_manuali_condiviso` | Catalogo manuali condiviso tra utenti |

### File statici (fallback)
- `/static/data/catalogo_manuali.json` — 85 manuali con indice capitoli
- `/static/data/catalogo_framework.json` — 21 framework disciplinari

### localStorage
| Chiave | Contenuto |
|--------|-----------|
| `matrix_sync_manuals` | Catalogo manuali sincronizzato da Matrix |
| `matrix_sync_frameworks` | Framework sincronizzati da Matrix |
| `matrix_sync_timestamp` | Data/ora ultima sincronizzazione |
| `matrix_openai_key` | API key OpenAI |
| `matrix_llm_model` | Modello LLM selezionato |
| `matrix_supabase_url` / `_key` | Configurazione Supabase |
| `matrix_email_firma` | Firma email del promotore |

### Frontend JS (ordine di caricamento)
1. `config.js` — Configurazione app e Supabase
2. `utils.js` — Toast, navigazione, badge, CSV export
3. `auth.js` — Login, registrazione, sessione, ruoli
4. `llm.js` — OpenAI: pre-classificazione, intelligence, note
5. `upload.js` — Upload PDF e batch processing
6. `database.js` — CRUD programmi, match, filtri
7. `archivio.js` — Archivio adozioni, filtri avanzati, export
8. `campagna.js` — Campagne, targeting, catalogo, email
9. `staging.js` — Staging, validazione, promozione
10. `gestione.js` — Gestione: framework, catalogo, utenti (solo gestore)
11. `sync.js` — Sincronizzazione incrementale da Matrix (GitHub)

## Sistema di ruoli

| Ruolo | Accesso |
|-------|---------|
| **Promotore** | Upload, Staging, Database, Campagne, Archivio, Impostazioni |
| **Gestore** | Tutto + sezione Gestione (framework, catalogo, utenti) |

- Il primo utente registrato diventa automaticamente **Gestore**
- Se nessun gestore esiste, qualsiasi utente puo auto-promuoversi da Impostazioni
- I gestori possono promuovere/declassare altri utenti

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| **Backend** | Hono (Cloudflare Pages) |
| **Frontend** | Tailwind CSS (CDN), FontAwesome, vanilla JS |
| **Database** | Supabase (PostgreSQL + RLS) |
| **PDF** | PDF.js (client-side) |
| **LLM** | OpenAI API (gpt-4o-mini / gpt-4o / gpt-4.1) |
| **Dati** | Matrix (GitHub) -> sincronizzazione incrementale |
| **Deploy** | Netlify (produzione), Cloudflare Pages (sandbox) |

## Comandi sviluppo

```bash
npm install                    # Installa dipendenze
npm run build                  # Build produzione (Cloudflare)
node build-netlify.mjs         # Build Netlify (HTML statico)
pm2 start ecosystem.config.cjs # Avvia in sandbox
pm2 logs --nostream            # Controlla log
```

## SQL Setup Supabase

Le seguenti tabelle devono essere create nel SQL Editor di Supabase:

```sql
-- Tabella profili
CREATE TABLE IF NOT EXISTS profili (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email TEXT,
  ruolo TEXT DEFAULT 'promotore' CHECK (ruolo IN ('promotore', 'gestore')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profili ENABLE ROW LEVEL SECURITY;

-- Tabella frameworks_condivisi
CREATE TABLE IF NOT EXISTS frameworks_condivisi (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  materia TEXT NOT NULL,
  dati JSONB,
  caricato_da UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE frameworks_condivisi ENABLE ROW LEVEL SECURITY;

-- Tabella catalogo_manuali_condiviso
CREATE TABLE IF NOT EXISTS catalogo_manuali_condiviso (
  id BIGSERIAL PRIMARY KEY,
  titolo TEXT NOT NULL,
  autore TEXT,
  editore TEXT,
  materia TEXT,
  is_zanichelli BOOLEAN DEFAULT false,
  capitoli_count INTEGER DEFAULT 0,
  dati JSONB,
  caricato_da UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE catalogo_manuali_condiviso ENABLE ROW LEVEL SECURITY;

-- Policy RLS (vedi documentazione per dettagli)
```

## Prossimi sviluppi

- [ ] Dashboard statistiche (KPI: programmi per materia, copertura scenari, tasso conversione)
- [ ] Notifiche push quando nuovi programmi vengono caricati
- [ ] Export report campagna in PDF
- [ ] Integrazione calendario visite docenti
- [ ] Storico adozioni multi-anno per trend analysis
- [ ] API REST per integrazione con CRM aziendale

---
MATRIX Intelligence v0.4 — Zanichelli
