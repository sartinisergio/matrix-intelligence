// ==========================================
// MATRIX Intelligence — LLM (OpenAI API)
// ==========================================

// --- Chiamata OpenAI ---
async function callOpenAI(systemPrompt, userPrompt, jsonMode = true) {
  const apiKey = CONFIG.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key OpenAI non configurata. Vai nelle Impostazioni.');
  }

  const model = CONFIG.LLM_MODEL;

  const body = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2000
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Errore OpenAI: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  if (jsonMode) {
    // Sanitizza il contenuto: rimuove caratteri di controllo che rompono JSON.parse()
    const sanitized = content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/[\x80-\x9F]/g, '')
      .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        const code = parseInt(hex, 16);
        // Rifiuta surrogates isolati e caratteri di controllo
        if (code >= 0xD800 && code <= 0xDFFF) return '';
        if (code <= 0x1F && code !== 0x09 && code !== 0x0A && code !== 0x0D) return '';
        return match;
      });
    
    try {
      return JSON.parse(sanitized);
    } catch (e) {
      // Prova a estrarre JSON dalla risposta
      const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('JSON fallback parse error:', e2, 'Content:', jsonMatch[0].substring(0, 200));
        }
      }
      throw new Error('Risposta LLM non è JSON valido');
    }
  }

  return content;
}

// --- Prompt Pre-classificazione ---
function getPreClassificationPrompt() {
  return `Sei un esperto analista di programmi universitari italiani.
Analizza il seguente programma di un insegnamento universitario ed estrai le informazioni richieste in formato JSON.

REGOLE:
1. Estrai SOLO informazioni esplicitamente presenti o chiaramente inferibili dal testo
2. Per i manuali citati, riporta ESATTAMENTE come appaiono nel programma: titolo, autore, editore
3. L'EDITORE è fondamentale: riportalo sempre se indicato nel programma
4. Assegna il ruolo "principale" al primo manuale o quello indicato come testo di riferimento/adottato
5. Assegna "alternativo" a tutti gli altri (letture consigliate, complementari, approfondimenti)
6. Inferisci la disciplina accademica dal contesto (nome corso, argomenti, facoltà)
7. Estrai 5-10 parole chiave dei temi principali del corso
8. Per scenario_zanichelli: verifica se l'EDITORE dei manuali citati è "Zanichelli" o "CEA" (Casa Editrice Ambrosiana, marchio del gruppo Zanichelli). NON basarti solo sul cognome dell'autore.
   - "zanichelli_principale": il manuale principale è edito da Zanichelli o CEA
   - "zanichelli_alternativo": solo un manuale alternativo è edito da Zanichelli o CEA
   - "zanichelli_assente": nessun manuale è edito da Zanichelli o CEA

RISPONDI SOLO con un JSON:
{
  "docente_nome": "Nome Cognome o null",
  "docente_email": "email o null",
  "ateneo": "Nome Ateneo o null",
  "corso_laurea": "Nome corso o null",
  "classe_laurea": "Es: L-13 o null",
  "materia_inferita": "Disciplina inferita",
  "manuali_citati": [
    {"titolo": "Titolo", "autore": "Autore/i", "editore": "Editore o non specificato", "ruolo": "principale|alternativo"}
  ],
  "temi_principali": ["tema1", "tema2"],
  "scenario_zanichelli": "zanichelli_principale|zanichelli_alternativo|zanichelli_assente"
}`;
}

// --- Prompt Motivazione Target ---
// CONTESTO: il promotore editoriale Zanichelli va dal docente con UNA novita.
// Il docente conosce gia il catalogo Zanichelli — se non ha adottato Mankiw/Brue
// finora, non cambiera idea. L'unica leva e il NUOVO volume.
//
// PRE-VALUTAZIONE: il volume non c'e ancora. Identifica le LEVE per il cambio.
//   "Dove il manuale attuale e debole rispetto al programma?"
//   "Su cosa deve puntare il nuovo volume per convincere il docente a cambiare?"
//
// FASE COMPLETA: il volume c'e. Nota operativa con leve specifiche.
//   "Ecco i punti concreti su cui il nuovo volume e piu forte del concorrente."

function getTargetMotivationPrompt(bookData, targetData) {
  const isPreValutazione = bookData.fase === 'pre_valutazione';
  
  // --- DATI CONCORRENTE (indice dal catalogo, se trovato) ---
  let concorrenteContext = '';
  let hasIndice = false;
  if (targetData.indice_concorrente) {
    hasIndice = true;
    concorrenteContext = `
═══════════════════════════════════════════
INDICE COMPLETO DEL MANUALE ADOTTATO (DATI VERIFICATI DAL CATALOGO):
${targetData.indice_concorrente}
═══════════════════════════════════════════
ATTENZIONE: L'indice sopra è il dato UFFICIALE. Usa SOLO questi capitoli nella tua analisi.
NON aggiungere, rimuovere o modificare capitoli. Se un tema del programma corrisponde a un capitolo dell'indice, il manuale LO COPRE.`;
  } else {
    concorrenteContext = `
NOTA: L'indice del manuale adottato NON è disponibile nel catalogo.
Puoi fare SOLO osservazioni generali basate sul titolo e sull'editore.
NON inventare capitoli o contenuti del manuale. Scrivi esplicitamente "Indice non disponibile nel catalogo — analisi limitata ai dati del programma."`;
  }
  
  // --- FRAMEWORK DISCIPLINARE ---
  let frameworkContext = '';
  if (targetData.framework_dettaglio && targetData.framework_dettaglio.length > 0) {
    frameworkContext = '\nFRAMEWORK DISCIPLINARE (struttura standard della materia):';
    for (const mod of targetData.framework_dettaglio.slice(0, 8)) {
      frameworkContext += `\n  ${mod.nome}: ${mod.concetti.join(', ')}`;
    }
  }
  if (targetData.framework_score > 0 && targetData.framework_moduli_coperti && targetData.framework_moduli_coperti.length > 0) {
    frameworkContext += `\nIl programma del docente copre: ${targetData.framework_moduli_coperti.join(', ')}.`;
  }
  
  // --- MANUALI COMPLEMENTARI ---
  const manualiCompl = targetData.manuali_complementari && targetData.manuali_complementari !== 'Nessuno'
    ? `\n- Testi complementari: ${targetData.manuali_complementari}` : '';
  
  // --- DATI CATTEDRA (comuni a entrambe le fasi) ---
  const cattedraBlock = `CATTEDRA:
- Docente: ${targetData.docente_nome || 'N/D'}
- Ateneo: ${targetData.ateneo || 'N/D'}
- Insegnamento: ${targetData.materia_inferita || 'N/D'}, ${targetData.classe_laurea || ''}
- Temi del programma: ${(targetData.temi_principali || []).join(', ') || 'Non disponibili'}
- Manuale adottato: ${targetData.manuale_attuale || 'Nessuno identificato'} ${targetData.manuale_editore ? '(' + targetData.manuale_editore + ')' : ''}${manualiCompl}
- Scenario: ${targetData.scenario_zanichelli || 'N/D'}`;

  // --- PROMPT ---
  if (isPreValutazione) {
    // ============ PRE-VALUTAZIONE ============
    const metodoAnalisi = hasIndice
      ? `METODO DI ANALISI (OBBLIGATORIO):
1. Per ogni tema del programma del docente, cerca il capitolo corrispondente nell'INDICE fornito sopra
2. Se il tema corrisponde a un capitolo → il manuale LO COPRE (non dire che manca!)
3. Un GAP esiste SOLO se un tema del programma NON ha un capitolo corrispondente nell'indice
4. Verifica OGNI affermazione contro l'indice prima di scriverla
5. NON usare la tua conoscenza pregressa del libro — basati SOLO sull'indice fornito`
      : `METODO DI ANALISI:
L'indice del manuale non è disponibile. Limita l'analisi a:
1. Confronto tra i temi del programma e il framework disciplinare
2. Osservazioni basate sullo scenario (Zanichelli presente/assente)
3. NON inventare contenuti o capitoli del manuale`;

    return `Sei un analista editoriale senior che prepara schede operative per promotori Zanichelli.
Il promotore andrà dal docente e deve sapere ESATTAMENTE con cosa si confronta, non informazioni generiche.

CONTESTO: Zanichelli valuta un nuovo volume di ${bookData.materia}${bookData.titolo ? ' ("' + bookData.titolo + '")' : ''}. Il volume non esiste ancora. Questa è una pre-valutazione della cattedra.

${cattedraBlock}
${concorrenteContext}${frameworkContext}

${metodoAnalisi}

ANALIZZA e rispondi con questa struttura (usa esattamente queste etichette):

PROGRAMMA DEL DOCENTE: NON elencare i temi (il promotore li conosce già). Rispondi invece a queste domande:
- Che TAGLIO ha questo corso rispetto a uno standard di ${bookData.materia}? (più teorico? più applicativo? orientato a una professione specifica?)
- C'è qualche SPECIFICITÀ che lo distingue? (es: enfasi su un'area, assenza di un'area tipica, approccio interdisciplinare, legame con laboratorio)
- A che LIVELLO si colloca? (introduttivo per L-2? avanzato? propedeutico a cosa?)
${targetData.framework_dettaglio && targetData.framework_dettaglio.length > 0 ? '- Rispetto al framework disciplinare, ci sono moduli ASSENTI o particolarmente ENFATIZZATI?' : ''}
Se il programma è standard senza particolarità evidenti, scrivilo chiaramente: "Programma standard di ${bookData.materia} senza specificità rilevanti."

MANUALE ATTUALE: ${hasIndice 
  ? 'NON elencare capitolo per capitolo. Rispondi in modo sintetico: (1) Il manuale copre adeguatamente il programma? Sì/Parzialmente/No. (2) Se parzialmente o no: QUALI temi specifici del programma NON hanno un capitolo corrispondente nell\'indice? Elenca SOLO i gap reali. (3) Il manuale ha capitoli che il docente NON usa nel suo programma? Se sì, quali? Questo indica sovradimensionamento. (4) Giudizio: adeguato, sovradimensionato o sottodimensionato per questa specifica cattedra?'
  : 'Indice non disponibile. Basandoti solo sul titolo, editore e scenario, descrivi in 2 frasi cosa si sa del manuale adottato e segnala che l\'analisi è limitata.'}

GAP E OPPORTUNITÀ: ${hasIndice
  ? 'Rispondi SOLO se ci sono gap reali (temi del programma senza capitolo nell\'indice). Se il manuale copre tutto, scrivi: "Nessun gap di contenuto. L\'opportunità è sul piano qualitativo." e indica UNA sola opportunità concreta che emerge da QUESTO specifico programma (non frasi generiche). VIETATO scrivere: "il docente potrebbe avere necessità di esercizi/applicazioni/risorse digitali" — questo vale per QUALSIASI docente e non è un\'informazione utile.'
  : 'Senza indice, segnala che i gap non sono verificabili. Indica solo osservazioni basate sullo scenario Zanichelli.'}

LEVE PER IL CAMBIO: Elenca esattamente 2 leve, numerate. Ogni leva DEVE seguire questo formato:
"1. [DATO DAL PROGRAMMA] → [CONSEGUENZA PER IL PROMOTORE]"
Esempio: "1. Il programma include chimica ambientale (tema assente nell'indice Brown) → il nuovo volume potrebbe coprire quest'area come differenziatore."
Esempio: "2. Corso per L-2 Biotecnologie con enfasi biochimica → il promotore può insistere sull'integrazione chimica-biologia che Brown (generalista) non offre."
Se non ci sono leve specifiche, scrivi onestamente: "Cattedra con bassa vulnerabilità al cambio: il manuale attuale copre bene il programma. Il promotore dovrà puntare su fattori non legati al contenuto (prezzo, servizio, relazione)."

DIVIETI ASSOLUTI (la scheda viene SCARTATA se li violi):
- ${hasIndice ? 'Ogni affermazione sul manuale DEVE essere verificabile nell\'indice fornito.' : 'NON inventare capitoli o contenuti del manuale.'}
- NON affermare che il manuale "non copre" un argomento se c'è un capitolo dedicato nell'indice
- NON usare la tua conoscenza pregressa del libro — solo i dati forniti qui
- NON scrivere frasi generiche applicabili a qualsiasi cattedra: "risorse digitali", "approccio innovativo", "esercizi pratici", "aggiornamento contenuti", "materiale supplementare" SENZA un collegamento a un dato SPECIFICO di questo programma
- NON ripetere i temi del programma come elenco — il promotore li ha già
- Tono: nota interna tra colleghi, diretto, asciutto. 3-4 frasi per sezione, massimo.`;

  } else {
    // ============ FASE COMPLETA ============
    let volumeInfo = `NUOVO VOLUME: ${bookData.titolo}`;
    if (bookData.autore) volumeInfo += ` di ${bookData.autore}`;
    volumeInfo += ` (${bookData.materia})`;
    if (bookData.temi && bookData.temi.length > 0) {
      volumeInfo += `\nArgomenti dal sommario: ${bookData.temi.join(', ')}`;
    }

    const metodoCompleto = hasIndice
      ? `METODO: Confronta l'indice del manuale concorrente con il sommario del nuovo volume e i temi del programma. Un capitolo è un gap SOLO se NON appare nell'indice.`
      : `METODO: Confronta il sommario del nuovo volume con i temi del programma. NON inventare contenuti del manuale concorrente.`;

    return `Sei un consulente commerciale per Zanichelli.
Prepari una NOTA OPERATIVA per un promotore che deve presentare un nuovo volume a un docente.

${volumeInfo}

${cattedraBlock}
${concorrenteContext}${frameworkContext}

${metodoCompleto}

ANALIZZA e rispondi con questa struttura:

SITUAZIONE: Cosa adotta oggi e perche e vulnerabile al cambio? ${hasIndice ? 'Confronta l\'indice con i temi del programma per identificare gap reali.' : 'Analisi limitata ai temi del programma.'}

LEVE: Dove il nuovo volume risponde meglio al programma rispetto al concorrente? Confronta argomenti specifici del sommario con i temi del programma. Nomina capitoli concreti.

COLLOQUIO: Cosa dire al docente? Su quali 2-3 punti specifici insistere? Quale argomento aprire per primo?

REGOLE TASSATIVE:
- ${hasIndice ? 'Verifica ogni affermazione sul concorrente contro l\'indice fornito.' : 'NON inventare contenuti del manuale concorrente.'}
- Basa TUTTO sui dati. NON inventare caratteristiche del volume non presenti nel sommario.
- Confronta concretamente: capitoli concorrente vs argomenti nuovo volume vs programma.
- 4-5 frasi per sezione. Tono: nota interna operativa, zero retorica.`;
  }
}

// --- Pre-classificazione di un programma ---
async function preClassifyProgram(rawText) {
  const systemPrompt = getPreClassificationPrompt();
  const result = await callOpenAI(systemPrompt, rawText, true);
  return result;
}

// --- Generazione motivazione target ---
async function generateMotivation(bookData, targetData) {
  const prompt = getTargetMotivationPrompt(bookData, targetData);
  const isPreVal = bookData.fase === 'pre_valutazione';
  const systemPrompt = isPreVal
    ? 'Sei un analista di mercato editoriale universitario. REGOLA FONDAMENTALE: se ti viene fornito l\'indice del manuale, OGNI tua affermazione sul suo contenuto DEVE essere verificabile nell\'indice. NON dire che un argomento "manca" se c\'è un capitolo dedicato. NON usare la tua conoscenza pregressa del libro. Basa tutto SOLO sui dati forniti nel prompt. Rispondi in italiano. Usa le etichette richieste. Sii specifico e diretto.'
    : 'Sei un consulente commerciale esperto del settore editoriale universitario. Se ti viene fornito l\'indice del concorrente, verifica ogni affermazione contro di esso. NON inventare. Basa tutto sui dati forniti. Rispondi in italiano. Usa le etichette richieste. Sii specifico e operativo.';
  const result = await callOpenAI(
    systemPrompt,
    prompt,
    false
  );
  return result.trim();
}
