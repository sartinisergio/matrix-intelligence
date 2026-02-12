# MATRIX Intelligence

## Panoramica
Piattaforma di intelligence commerciale per promotori editoriali Zanichelli. Analizza programmi universitari, identifica docenti target, genera motivazioni personalizzate e prepara email di primo contatto.

## URL
- **Produzione (Netlify)**: https://matrix-intelligence.netlify.app
- **GitHub**: https://github.com/sartinisergio/matrix-intelligence
- **Matrix (dati sorgente)**: https://github.com/sartinisergio/matrix-analisi-programmi

## Flusso operativo del promotore

```
1. Upload programmi PDF        → Pre-classificazione automatica (LLM)
2. Crea campagna               → Materia + volume da promuovere
3. Genera lista target         → Matching programmi + scenario Zanichelli
4. Aggiungi indice volume      → Rigenera motivazioni specifiche (Fase 2)
5. Genera mail personalizzata  → 3 template per scenario (conquista/aggiornamento/upgrade)
6. Copia e invia               → Il promotore rivede, personalizza e invia dal suo client di posta
```

## Funzionalita implementate

### Upload Programmi
- Drag & drop PDF programmi universitari
- Estrazione testo con PDF.js (client-side)
- Pre-classificazione automatica via LLM (OpenAI): docente, ateneo, materia, manuali, scenario Zanichelli
- Salvataggio su Supabase (tabella `programmi`)

### Database Programmi
- Consultazione e filtro: ricerca testuale, materia, ateneo, scenario Zanichelli
- Dettaglio programma con modale
- Modifica e eliminazione inline
- Badge scenario colorati (Principale/Alternativo/Assente)

### Campagne — Intelligence a 2 fasi

**Fase 1 — Pre-valutazione** (il volume non esiste ancora):
- Crei una campagna inserendo titolo volume + materia
- Il sistema genera target con matching materia + scenario Zanichelli
- L'LLM analizza ogni target incrociando:
  - Temi del programma del docente
  - Indice completo del concorrente (dal catalogo MATRIX)
  - Framework disciplinare con moduli e concetti chiave
- Produce schede di intelligence con 3 blocchi collassabili:
  - **SITUAZIONE**: adozione attuale del docente
  - **LEVE**: dove il nuovo volume risponde meglio
  - **COLLOQUIO**: cosa dire al docente
- Badge blu "Pre-valutazione" — senza API key usa template di fallback

**Fase 2 — Analisi completa** (il volume esiste):
- Aggiungi l'indice/sommario del volume
- Il sistema estrae temi chiave dall'indice via LLM
- Rigenera motivazioni con confronto diretto volume vs concorrente
- Badge verde "Completa"

**Pannello Scenario A/B/C:**
- A (Verde): Framework + Manuali → analisi qualitativa completa
- B (Giallo): Solo framework o solo manuali → analisi parziale
- C (Arancione): Nessuna risorsa → matching basico

**Algoritmo di matching:**
- Filtro per materia (con sinonimi)
- Priorita: zanichelli_assente=alta, alternativo=media, principale=bassa
- Aggiustamento con overlap tematico (>40%) e framework score (>30%)
- Lookup concorrente nel catalogo con indice completo

**Indicatori target:**
- **Overlap %**: allineamento tematico tra programma docente e contenuti di riferimento
- **FW %**: copertura del framework disciplinare MATRIX da parte del programma

### Generazione Email personalizzate
Per ogni target della lista, il promotore puo generare una mail di primo contatto:

**3 template differenziati per scenario:**
- **Conquista** (Zanichelli assente): proposta nuovo volume come alternativa
- **Aggiornamento** (Zanichelli principale): presentazione nuovo titolo del catalogo
- **Upgrade** (Zanichelli alternativo): promozione a testo principale

**Funzionalita della modale email:**
- Oggetto editabile
- Campo link anteprima opera (sostituisce `[LINK_ANTEPRIMA]`)
- Placeholder `[CORSO DI LAUREA]` compilato dal promotore
- Corpo mail generato dal LLM, editabile
- Firma persistente (salvata per le successive)
- Bottone "Copia tutto" e "Apri in Mail"
- Badge colorato che indica il tipo di mail (Conquista/Aggiornamento/Upgrade)

### Sincronizzazione dati da Matrix
I dati di riferimento (framework disciplinari e catalogo manuali) provengono da Matrix. La sincronizzazione mantiene allineati i due sistemi.

**Come funziona:**
- Matrix (GitHub) e la fonte unica dei dati
- Il bottone "Sincronizza da Matrix" (in Impostazioni) scarica i cataloghi
- **Prima sincronizzazione**: scarica tutto (~21 framework + ~85 manuali individuali con indici)
- **Sincronizzazioni successive**: confronta per ID e conteggio, scarica solo le differenze
- Dati salvati in localStorage del browser
- Bottone "Forza completa" per resettare e risincronizzare tutto

**Flusso di aggiornamento dati:**
```
Matrix (gestione dati)           Matrix Intelligence (consumatore)
  │                                      │
  │  manual_catalog.json                 │
  │  framework_catalog.json              │
  │  + file individuali (frameworks/,    │
  │    manuali/)                         │
  │                                      │
  └── GitHub raw URL ──────────────────→ Bottone "Sincronizza"
                                         │
                                     Scarica cataloghi
                                     Confronta con dati locali
                                     Scarica solo le differenze
                                     Salva in localStorage
```

### Catalogo MATRIX
- 85 manuali in 5 materie con indice capitoli completo
- 21 framework disciplinari con moduli, concetti chiave e profili classe di laurea
- Importazione indice dal catalogo nel form campagna
- Upload manuale di framework e manuali aggiuntivi

### Impostazioni
- API Key OpenAI (salvata in localStorage)
- Scelta modello LLM (gpt-4o-mini consigliato)
- Configurazione Supabase (URL + anon key)
- Sincronizzazione dati Matrix (con info ultima sync)

## Architettura dati

### Supabase (tabelle)
- `programmi`: programmi universitari (docente, ateneo, materia, manuali_citati, scenario, temi)
- `campagne`: campagne (libro, materia, indice, temi, target_generati, stato: bozza/completata)

### File statici (fallback)
- `/static/data/catalogo_manuali.json` (~191 KB, 85 manuali con indice capitoli)
- `/static/data/catalogo_framework.json` (~138 KB, 21 framework)

### localStorage (dati sincronizzati)
- `matrix_sync_manuals` — catalogo manuali sincronizzato da Matrix
- `matrix_sync_frameworks` — catalogo framework sincronizzato da Matrix
- `matrix_sync_timestamp` — data/ora ultima sincronizzazione
- `matrix_openai_key` — API key OpenAI
- `matrix_llm_model` — modello LLM selezionato
- `matrix_supabase_url` / `matrix_supabase_key` — configurazione Supabase
- `matrix_email_firma` — firma email del promotore

### Frontend JS
- `config.js` — Configurazione app e Supabase
- `auth.js` — Login, registrazione, sessione
- `utils.js` — Toast, navigazione, badge, CSV export
- `llm.js` — OpenAI: pre-classificazione, intelligence di mercato, note operative
- `upload.js` — Upload PDF e batch processing
- `database.js` — CRUD programmi con filtri
- `campagna.js` — Campagne, targeting, catalogo, email personalizzate
- `sync.js` — Sincronizzazione incrementale dati da Matrix (GitHub)

## Stack tecnologico
- **Backend**: Hono (Cloudflare Pages)
- **Frontend**: Tailwind CSS (CDN), FontAwesome, vanilla JS
- **Database**: Supabase (PostgreSQL)
- **PDF**: PDF.js (client-side)
- **LLM**: OpenAI API (gpt-4o-mini / gpt-4o)
- **Dati di riferimento**: Matrix (GitHub) → sincronizzazione incrementale
- **Deploy**: Netlify (produzione), Cloudflare Pages (sandbox)

## Comandi sviluppo
```bash
npm install                    # Installa dipendenze
npm run build                  # Build produzione (Cloudflare)
node build-netlify.mjs         # Build Netlify (HTML statico)
pm2 start ecosystem.config.cjs # Avvia in sandbox
pm2 logs --nostream            # Controlla log
```

## Branching
- `main` — produzione (deploy automatico su Netlify)
- `dev/*` — sviluppo (testare su sandbox prima del merge)

---
MATRIX Intelligence v0.3 — Zanichelli
