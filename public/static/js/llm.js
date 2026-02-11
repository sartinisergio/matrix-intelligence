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
    try {
      return JSON.parse(content);
    } catch (e) {
      // Prova a estrarre JSON dalla risposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error('Risposta LLM non è JSON valido');
    }
  }

  return content;
}

// --- Prompt Pre-classificazione ---
function getPreClassificationPrompt() {
  const authorsListStr = CONFIG.ZANICHELLI_AUTHORS.join(', ');
  
  return `Sei un esperto analista di programmi universitari italiani.
Analizza il seguente programma di un insegnamento universitario ed estrai le informazioni richieste in formato JSON.

REGOLE IMPORTANTI:
1. Estrai SOLO informazioni esplicitamente presenti o chiaramente inferibili dal testo
2. Per i manuali citati, riporta esattamente come appaiono: titolo, autore, editore
3. Assegna il ruolo "principale" al primo manuale o quello indicato come testo di riferimento
4. Assegna "alternativo" agli altri manuali
5. Inferisci la disciplina accademica dal contesto (nome corso, argomenti, facoltà)
6. Estrai 5-10 parole chiave che rappresentano i temi principali del corso
7. Per scenario_zanichelli, determina:
   - "zanichelli_principale" se il manuale principale è di un autore Zanichelli noto
   - "zanichelli_alternativo" se Zanichelli appare tra i manuali alternativi
   - "zanichelli_assente" se nessun manuale Zanichelli è citato

AUTORI ZANICHELLI NOTI: ${authorsListStr}

RISPONDI ESCLUSIVAMENTE con un oggetto JSON con questa struttura:
{
  "docente_nome": "Nome Cognome o null",
  "docente_email": "email@ateneo.it o null",
  "ateneo": "Nome Ateneo o null",
  "corso_laurea": "Nome del corso di laurea o null",
  "classe_laurea": "Es: L-13, LM-54 o null",
  "materia_inferita": "Disciplina inferita",
  "manuali_citati": [
    {
      "titolo": "Titolo manuale",
      "autore": "Autore/i",
      "editore": "Editore",
      "ruolo": "principale|alternativo"
    }
  ],
  "temi_principali": ["tema1", "tema2", "tema3"],
  "scenario_zanichelli": "zanichelli_principale|zanichelli_alternativo|zanichelli_assente"
}

Se un campo non è determinabile, usa null (per stringhe) o [] (per array).`;
}

// --- Prompt Motivazione Target ---
// Due modalita:
// PRE-VALUTAZIONE: il volume non esiste ancora. Intelligence di mercato.
//   "Cosa serve per competere su questa cattedra?"
// FASE COMPLETA: il volume c'e. Nota operativa per il promotore.
//   "Perche questo docente e un target e come presentare il volume?"

function getTargetMotivationPrompt(bookData, targetData) {
  const isPreValutazione = bookData.fase === 'pre_valutazione';
  
  // --- DATI CONCORRENTE (indice dal catalogo, se trovato) ---
  let concorrenteContext = '';
  if (targetData.indice_concorrente) {
    concorrenteContext = `\nINDICE DEL MANUALE ADOTTATO (dal catalogo editoriale):
${targetData.indice_concorrente}`;
  }
  
  // --- FRAMEWORK DISCIPLINARE ---
  let frameworkContext = '';
  if (targetData.framework_dettaglio && targetData.framework_dettaglio.length > 0) {
    frameworkContext = '\nFRAMEWORK DISCIPLINARE MATRIX (struttura standard della materia):';
    for (const mod of targetData.framework_dettaglio.slice(0, 8)) {
      frameworkContext += `\n  ${mod.nome}: ${mod.concetti.join(', ')}`;
    }
  }
  if (targetData.framework_score > 0) {
    frameworkContext += `\nCopertura framework: il programma del docente copre il ${targetData.framework_score}% del framework standard.`;
    if (targetData.framework_moduli_coperti && targetData.framework_moduli_coperti.length > 0) {
      frameworkContext += ` Moduli coperti: ${targetData.framework_moduli_coperti.join(', ')}.`;
    }
  }
  
  // --- CONTESTO VOLUME ---
  let volumeContext = '';
  if (isPreValutazione) {
    volumeContext = `PROGETTO EDITORIALE: Zanichelli sta valutando un nuovo volume di ${bookData.materia}${bookData.titolo ? ` (titolo provvisorio: "${bookData.titolo}")` : ''}.
Il volume non e ancora disponibile. Questa e un'analisi di mercato.`;
  } else {
    volumeContext = `NUOVO VOLUME ZANICHELLI:
- Titolo: ${bookData.titolo}
- Autore: ${bookData.autore || 'N/D'}
- Materia: ${bookData.materia}`;
    if (bookData.temi && bookData.temi.length > 0) {
      volumeContext += `\n- Argomenti (dal sommario): ${bookData.temi.join(', ')}`;
    }
  }
  
  // --- MANUALI COMPLEMENTARI ---
  const manualiCompl = targetData.manuali_complementari && targetData.manuali_complementari !== 'Nessuno'
    ? `\n- Testi complementari nel programma: ${targetData.manuali_complementari}` : '';
  
  // --- PROMPT ---
  if (isPreValutazione) {
    // ============ PRE-VALUTAZIONE: INTELLIGENCE DI MERCATO ============
    return `Sei un analista di mercato editoriale universitario per Zanichelli.
Stai preparando una SCHEDA DI INTELLIGENCE per un promotore che deve capire il terreno competitivo su una cattedra.

${volumeContext}

CATTEDRA ANALIZZATA:
- Docente: ${targetData.docente_nome || 'N/D'}
- Ateneo: ${targetData.ateneo || 'N/D'}
- Insegnamento: ${targetData.materia_inferita || 'N/D'}
- Classe di laurea: ${targetData.classe_laurea || 'N/D'}
- Temi del programma: ${(targetData.temi_principali || []).join(', ') || 'N/D'}
- Manuale adottato: ${targetData.manuale_attuale || 'Nessuno identificato'}
- Editore: ${targetData.manuale_editore || 'N/D'}${manualiCompl}
- Scenario Zanichelli: ${targetData.scenario_zanichelli || 'N/D'}
${concorrenteContext}${frameworkContext}

ISTRUZIONI:
Scrivi una nota di intelligence in 4-5 frasi per il promotore. Deve rispondere a:

1. ADOZIONE ATTUALE: Che manuale usa e come lo usa? Se hai l'indice del concorrente e i temi del programma, analizza quali capitoli del concorrente sono centrali nel programma del docente e quali sono marginali o assenti.

2. STRUTTURA DEL PROGRAMMA: Quali aree tematiche pesano di piu nel programma? Il docente ha un taglio piu micro o macro, teorico o applicato, istituzionale o avanzato?

3. PER COMPETERE: Alla luce del programma e del manuale adottato, come dovrebbe essere strutturato un nuovo volume per essere competitivo su questa cattedra? Dove il concorrente e forte e dove e debole rispetto al programma? Cosa deve offrire in piu il nuovo volume?

REGOLE:
- Basa TUTTO sui dati forniti. NON inventare.
- Sii specifico: nomina capitoli, temi, aree concrete.
- Tono: nota interna analitica, non promozionale.
- NON dire "il nuovo volume offre" o "il nostro libro" — il volume non esiste ancora.`;

  } else {
    // ============ FASE COMPLETA: NOTA OPERATIVA PROMOTORE ============
    return `Sei un consulente commerciale per Zanichelli.
Stai preparando una NOTA OPERATIVA per un promotore che deve visitare un docente e presentare un nuovo volume.

${volumeContext}

CATTEDRA TARGET:
- Docente: ${targetData.docente_nome || 'N/D'}
- Ateneo: ${targetData.ateneo || 'N/D'}
- Insegnamento: ${targetData.materia_inferita || 'N/D'}
- Classe di laurea: ${targetData.classe_laurea || 'N/D'}
- Temi del programma: ${(targetData.temi_principali || []).join(', ') || 'N/D'}
- Manuale adottato: ${targetData.manuale_attuale || 'Nessuno identificato'}
- Editore: ${targetData.manuale_editore || 'N/D'}${manualiCompl}
- Scenario Zanichelli: ${targetData.scenario_zanichelli || 'N/D'}
${concorrenteContext}${frameworkContext}

ISTRUZIONI:
Scrivi una nota operativa in 4-5 frasi. Deve rispondere a:

1. SITUAZIONE: Cosa adotta oggi e perche e un target interessante?
2. PUNTI DI FORZA DEL NOSTRO VOLUME: Dove il nostro volume copre meglio il programma rispetto al concorrente? Quali argomenti del sommario rispondono ai temi del docente?
3. AZIONE: Come presentare il volume? Su quali punti insistere nel colloquio?

REGOLE:
- Basa TUTTO sui dati forniti. NON inventare caratteristiche del volume.
- Confronta concretamente: capitoli del concorrente vs argomenti del nostro volume vs temi del programma.
- Sii specifico e operativo. Il promotore deve sapere cosa dire.
- Tono: nota interna commerciale, concreto.`;
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
    ? 'Sei un analista di mercato editoriale universitario. Produci analisi competitive precise basate esclusivamente sui dati forniti. Non inventare informazioni. Rispondi in italiano con 4-5 frasi. Nessun titolo, nessuna formattazione markdown.'
    : 'Sei un consulente commerciale esperto del settore editoriale universitario. Produci note operative per promotori basate esclusivamente sui dati forniti. Non inventare informazioni. Rispondi in italiano con 4-5 frasi. Nessun titolo, nessuna formattazione markdown.';
  const result = await callOpenAI(
    systemPrompt,
    prompt,
    false
  );
  return result.trim();
}
