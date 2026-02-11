# MATRIX Intelligence

## Panoramica
Piattaforma di intelligence commerciale per promotori editoriali Zanichelli. Analizza programmi universitari, identifica docenti target, genera schede di intelligence con leve per il cambio di adozione.

## URL
- **Sandbox**: https://3000-i0f5fezus1digiwxhlfix-02b9cc79.sandbox.novita.ai
- **Login**: `/` o `/login`
- **Dashboard**: `/dashboard`
- **API Health**: `/api/health`
- **GitHub**: https://github.com/sartinisergio/matrix-intelligence

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
- Produce schede di intelligence con 3 blocchi:
  - **MANUALE ATTUALE**: cosa usa il docente, quali capitoli corrispondono al programma
  - **GAP E PUNTI DEBOLI**: dove il concorrente non copre il programma
  - **LEVE PER IL CAMBIO**: su cosa puntare per convincere il docente
- Badge blu "Pre-valutazione" — senza API key usa template di fallback

**Fase 2 — Analisi completa** (il volume esiste):
- Aggiungi l'indice/sommario del volume
- Il sistema estrae temi chiave dall'indice via LLM
- Rigenera note operative con confronto diretto:
  - **SITUAZIONE**: adozione attuale e vulnerabilita al cambio
  - **LEVE**: dove il nuovo volume risponde meglio del concorrente
  - **COLLOQUIO**: cosa dire al docente, su quali punti insistere
- Badge verde "Completa"

**Pannello Scenario A/B/C:**
- A (Verde): Framework + Manuali -> analisi qualitativa completa
- B (Giallo): Solo framework o solo manuali -> analisi parziale
- C (Arancione): Nessuna risorsa -> matching basico

**Algoritmo di matching:**
- Filtro per materia (con sinonimi)
- Priorita: zanichelli_assente=alta, alternativo=media, principale=bassa
- Aggiustamento con overlap tematico (>40%) e framework score (>30%)
- Lookup concorrente nel catalogo con indice completo (findManualInCatalog)

**Indicatori target:**
- **Overlap %**: allineamento tematico tra programma docente e contenuti di riferimento
- **FW %**: copertura del framework disciplinare MATRIX da parte del programma

### Catalogo MATRIX
- 85 manuali in 5 materie con indice capitoli completo
- 21 framework disciplinari con moduli e concetti chiave
- Importazione indice dal catalogo nel form campagna

### Impostazioni
- API Key OpenAI (salvata in localStorage)
- Scelta modello LLM (gpt-4o-mini consigliato)
- Configurazione Supabase (URL + anon key)

## Architettura dati

### Supabase (tabelle)
- `programmi`: programmi universitari (docente, ateneo, materia, manuali_citati, scenario, temi)
- `campagne`: campagne (libro, materia, indice, temi, target_generati, stato: bozza/completata)

### File statici
- `/static/data/catalogo_manuali.json` (~191 KB, 85 manuali con indice capitoli)
- `/static/data/catalogo_framework.json` (~138 KB, 21 framework)

### Frontend JS
- `config.js` — Configurazione app e Supabase
- `auth.js` — Login, registrazione, sessione
- `utils.js` — Toast, navigazione, badge, CSV export
- `llm.js` — OpenAI: pre-classificazione, intelligence di mercato, note operative
- `upload.js` — Upload PDF e batch processing
- `database.js` — CRUD programmi con filtri
- `campagna.js` — Campagne, targeting, catalogo, findManualInCatalog

## Stack tecnologico
- **Backend**: Hono (Cloudflare Pages)
- **Frontend**: Tailwind CSS (CDN), FontAwesome, vanilla JS
- **Database**: Supabase (PostgreSQL)
- **PDF**: PDF.js (client-side)
- **LLM**: OpenAI API (gpt-4o-mini / gpt-4o)
- **Deploy**: Cloudflare Pages / Netlify (compatibile)

## Prossimi passi di sviluppo
Vedi sezione dedicata in fondo.

## Comandi sviluppo
```bash
npm install          # Installa dipendenze
npm run build        # Build produzione
npm run dev          # Dev server locale (Vite)
pm2 start ecosystem.config.cjs  # Avvia in sandbox
pm2 logs --nostream  # Controlla log
```

---
MATRIX Intelligence v0.2 - Zanichelli
