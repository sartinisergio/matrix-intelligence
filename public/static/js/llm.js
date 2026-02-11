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
  if (targetData.indice_concorrente) {
    concorrenteContext = `\nINDICE COMPLETO DEL MANUALE ADOTTATO (dal catalogo):
${targetData.indice_concorrente}`;
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
    return `Sei un analista di mercato editoriale universitario.
Prepari una scheda per un promotore Zanichelli che deve capire le LEVE per un possibile cambio di adozione su questa cattedra.

CONTESTO: Zanichelli sta valutando un nuovo volume di ${bookData.materia}${bookData.titolo ? ' ("' + bookData.titolo + '")' : ''}. Il volume non esiste ancora. Il promotore deve sapere su cosa concentrare i suoi sforzi.

${cattedraBlock}
${concorrenteContext}${frameworkContext}

ANALIZZA e rispondi con questa struttura (usa esattamente queste etichette):

MANUALE ATTUALE: Descrivi il manuale adottato. Se hai l'indice, analizza quali capitoli corrispondono ai temi del programma del docente e quali NO. Il docente usa tutto il manuale o solo una parte? Ci sono aree del programma che il manuale copre male o non copre?

GAP E PUNTI DEBOLI: Identifica i punti deboli specifici del manuale rispetto a QUESTO programma. Dove il docente deve integrare con altri materiali? Quali temi del programma non trovano riscontro nell'indice del manuale? Queste sono le leve per il cambio.

LEVE PER IL CAMBIO: Su cosa deve puntare il nuovo volume per convincere questo docente a cambiare? Non suggerimenti generici ("casi studio", "approccio applicato") ma leve SPECIFICHE legate ai gap identificati. Cosa manca concretamente al manuale attuale che il docente probabilmente compensa con dispense, articoli o altri materiali?

REGOLE TASSATIVE:
- Basa TUTTO sui dati forniti. NON inventare contenuti del nuovo volume.
- Sii SPECIFICO: nomina capitoli, temi, aree concrete — niente frasi generiche.
- Le leve devono essere azionabili: il promotore deve poterle usare in un colloquio.
- 4-5 frasi massimo. Tono: nota interna, diretto, zero retorica.
- NON usare formule tipo "per competere efficacemente" o "un approccio piu applicato".`;

  } else {
    // ============ FASE COMPLETA ============
    let volumeInfo = `NUOVO VOLUME: ${bookData.titolo}`;
    if (bookData.autore) volumeInfo += ` di ${bookData.autore}`;
    volumeInfo += ` (${bookData.materia})`;
    if (bookData.temi && bookData.temi.length > 0) {
      volumeInfo += `\nArgomenti dal sommario: ${bookData.temi.join(', ')}`;
    }

    return `Sei un consulente commerciale per Zanichelli.
Prepari una NOTA OPERATIVA per un promotore che deve presentare un nuovo volume a un docente.

${volumeInfo}

${cattedraBlock}
${concorrenteContext}${frameworkContext}

ANALIZZA e rispondi con questa struttura:

SITUAZIONE: Cosa adotta oggi e perche e vulnerabile al cambio? Identifica i gap tra il manuale attuale e il programma del docente.

LEVE: Dove il nuovo volume risponde meglio al programma rispetto al concorrente? Confronta argomenti specifici del sommario con i temi del programma. Nomina capitoli concreti.

COLLOQUIO: Cosa dire al docente? Su quali 2-3 punti specifici insistere? Quale argomento aprire per primo?

REGOLE TASSATIVE:
- Basa TUTTO sui dati. NON inventare caratteristiche del volume non presenti nel sommario.
- Confronta concretamente: capitoli concorrente vs argomenti nuovo volume vs programma.
- 4-5 frasi. Tono: nota interna operativa, zero retorica.`;
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
    ? 'Sei un analista di mercato editoriale universitario. Il tuo obiettivo e identificare le leve concrete per un cambio di adozione. Basa tutto sui dati forniti, non inventare. Rispondi in italiano. Usa le etichette richieste (MANUALE ATTUALE, GAP E PUNTI DEBOLI, LEVE PER IL CAMBIO). Sii specifico e diretto, niente frasi generiche.'
    : 'Sei un consulente commerciale esperto del settore editoriale universitario. Il tuo obiettivo e preparare il promotore al colloquio con il docente. Basa tutto sui dati forniti, non inventare. Rispondi in italiano. Usa le etichette richieste (SITUAZIONE, LEVE, COLLOQUIO). Sii specifico e operativo.';
  const result = await callOpenAI(
    systemPrompt,
    prompt,
    false
  );
  return result.trim();
}
