# MATRIX Intelligence

## Panoramica
Piattaforma di analisi e targeting per promotori editoriali Zanichelli. Analizza programmi universitari, identifica docenti target e genera campagne promozionali intelligenti.

## URL
- **Sandbox**: https://3000-i0f5fezus1digiwxhlfix-02b9cc79.sandbox.novita.ai
- **Login**: `/` o `/login`
- **Dashboard**: `/dashboard`
- **API Health**: `/api/health`

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

### Campagne (flusso a 2 fasi)
**Fase 1 — Pre-valutazione** (senza indice, senza API key):
- Crei una campagna inserendo titolo volume + materia
- Il sistema rileva automaticamente lo Scenario A/B/C (risorse disponibili)
- Genera immediatamente i target con matching basato su materia + scenario Zanichelli
- Motivazioni template automatiche (nessuna chiamata LLM necessaria)
- Badge blu "Pre-valutazione" nella lista campagne

**Fase 2 — Analisi completa** (con indice e API key):
- Aggiungi l'indice/sommario del volume (manualmente o importando dal catalogo MATRIX)
- Il sistema estrae temi chiave dall'indice via LLM
- Rigenera i target con motivazioni personalizzate via OpenAI
- Overlap tematico e framework score calcolati
- Badge verde "Completa" nella lista campagne

**Pannello Scenario A/B/C:**
- A (Verde): Framework + Manuali presenti -> analisi qualitativa completa
- B (Giallo): Solo framework o solo manuali -> analisi parziale
- C (Arancione): Nessuna risorsa -> matching basico
- Upload di risorse mancanti (JSON) senza bloccare il flusso

**Algoritmo di matching:**
- Filtro per materia (con sinonimi: es. "Chimica Generale" = "Chimica Generale e Inorganica")
- Priorita basata su scenario Zanichelli: assente=alta, alternativo=media, principale=bassa
- Aggiustamento con overlap tematico (>40%) e framework score (>30%)
- Profilo classe di laurea (dal framework disciplinare)

### Catalogo MATRIX
- 85 manuali in 5 materie (Chimica Generale 34, Chimica Organica 15, Economia Politica 14, Fisica 17, Istologia 5)
- 21 framework di valutazione disciplinare
- Importazione indice/capitoli dal catalogo nel form campagna

### Impostazioni
- API Key OpenAI (salvata in localStorage)
- Scelta modello LLM (gpt-4o-mini consigliato)
- Configurazione Supabase (URL + anon key)

## Architettura dati

### Supabase (tabelle)
- `programmi`: programmi universitari analizzati (docente, ateneo, materia, manuali, scenario, temi)
- `campagne`: campagne promozionali (libro, materia, indice, temi, target_generati, stato)

### File statici (catalogo)
- `/static/data/catalogo_manuali.json` (~191 KB, 85 manuali)
- `/static/data/catalogo_framework.json` (~138 KB, 21 framework)

### Frontend JS
- `config.js` — Configurazione app e Supabase
- `auth.js` — Login, registrazione, sessione
- `utils.js` — Toast, navigazione, badge, CSV export
- `llm.js` — Chiamate OpenAI, prompt pre-classificazione e motivazione
- `upload.js` — Upload PDF e batch processing
- `database.js` — CRUD programmi con filtri
- `campagna.js` — Campagne, targeting, scenario A/B/C, catalogo MATRIX

## Stack tecnologico
- **Backend**: Hono (Cloudflare Pages)
- **Frontend**: Tailwind CSS (CDN), FontAwesome, vanilla JS
- **Database**: Supabase (PostgreSQL)
- **PDF**: PDF.js (client-side)
- **LLM**: OpenAI API (gpt-4o-mini / gpt-4o)
- **Deploy**: Cloudflare Pages via Wrangler

## Prossimi passi
1. Test end-to-end del flusso completo: Upload -> Database -> Campagna -> Target -> CSV
2. Gap analysis: confronto programma del docente vs framework disciplinare
3. Anteprima libro (indice completo navigabile)
4. Metriche di successo per il matching (punteggio di rilevanza, copertura moduli)
5. Deploy in produzione su Cloudflare Pages

## Comandi sviluppo
```bash
npm install          # Installa dipendenze
npm run build        # Build produzione
npm run dev          # Dev server locale (Vite)
pm2 start ecosystem.config.cjs  # Avvia in sandbox
pm2 logs --nostream  # Controlla log
```

---
MATRIX Intelligence v0.1 - Zanichelli
