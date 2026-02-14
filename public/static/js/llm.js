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
  
  // --- TESTO INTEGRALE DEL PROGRAMMA (nuovo: passato dal campo testo_programma) ---
  let testoProgrammaBlock = '';
  if (targetData.testo_programma && targetData.testo_programma.trim().length > 50) {
    // Cap di sicurezza: 25.000 caratteri per evitare PDF anomali
    const testoTroncato = targetData.testo_programma.trim().slice(0, 25000);
    const troncato = targetData.testo_programma.trim().length > 25000;
    testoProgrammaBlock = `
═══════════════════════════════════════════
TESTO INTEGRALE DEL PROGRAMMA DEL DOCENTE (estratto dal PDF):
${testoTroncato}${troncato ? '\n[... testo troncato a 25.000 caratteri ...]' : ''}
═══════════════════════════════════════════`;
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
- Manuale adottato: ${targetData.manuale_attuale || 'Nessuno identificato'} ${targetData.manuale_editore ? '(' + targetData.manuale_editore + ')' : ''}${manualiCompl}
- Scenario: ${targetData.scenario_zanichelli || 'N/D'}`;

  // --- PROMPT ---
  if (isPreValutazione) {
    // ============ PRE-VALUTAZIONE ============
    const metodoAnalisi = hasIndice
      ? `METODO DI ANALISI (OBBLIGATORIO):
1. Leggi ATTENTAMENTE il testo integrale del programma: CFU, obiettivi, metodologia, criteri di valutazione, contenuti dettagliati
2. Per ogni tema del programma, cerca il capitolo corrispondente nell'INDICE del manuale
3. Se il tema corrisponde a un capitolo → il manuale LO COPRE (non dire che manca!)
4. Un GAP esiste SOLO se un tema del programma NON ha un capitolo corrispondente nell'indice
5. NON usare la tua conoscenza pregressa del libro — basati SOLO sull'indice fornito`
      : `METODO DI ANALISI:
L'indice del manuale non è disponibile. Usa il testo integrale del programma per:
1. Capire struttura, livello, metodologia e specificità del corso
2. NON inventare contenuti o capitoli del manuale`;

    return `Sei un analista editoriale senior che prepara schede operative per promotori Zanichelli.
Il promotore andrà dal docente e deve capire ESATTAMENTE la cattedra e con cosa si confronta.

CONTESTO: Zanichelli valuta un nuovo volume di ${bookData.materia}${bookData.titolo ? ' ("' + bookData.titolo + '")' : ''}. Il volume non esiste ancora. Questa è una pre-valutazione della cattedra.

${cattedraBlock}
${testoProgrammaBlock}
${concorrenteContext}${frameworkContext}

${metodoAnalisi}

ANALIZZA IL TESTO INTEGRALE DEL PROGRAMMA e rispondi con questa struttura (usa esattamente queste etichette):

PROGRAMMA DEL DOCENTE: Analizza il programma in profondità. NON elencare gli argomenti. Il promotore deve capire:
- STRUTTURA DIDATTICA: Come è organizzato il corso? (CFU, ore lezione vs esercitazione, eventuali laboratori, modalità d'esame — scritto/orale/progetto). Queste informazioni sono nel testo del programma: leggile e riportale.
- TAGLIO: Che orientamento ha? (teorico puro? applicativo-professionalizzante? con enfasi su calcolo/stechiometria? orientato a biologia/farmacia/ingegneria?). Dedurlo dagli argomenti E dalla classe di laurea.
- SPECIFICITÀ: Cosa distingue QUESTO programma da uno standard di ${bookData.materia}? Cerca: argomenti inusuali, enfasi particolari su aree specifiche, assenza di moduli tipici, approccio interdisciplinare. Se dal testo emergono metodologie didattiche particolari (TBL, didattica innovativa, coteaching), segnalale.
- Se il programma è standard senza particolarità, scrivi: "Programma standard" e spiega brevemente PERCHÉ è standard (copre tutti i moduli classici senza enfasi particolari).

MANUALE ATTUALE: ${hasIndice 
  ? 'Valutazione sintetica ma CONCRETA: (1) COPERTURA: il manuale copre il programma? Sì/Parzialmente/No — e una frase di spiegazione. (2) GAP REALI: temi del programma SENZA capitolo nell\'indice. Elenca SOLO quelli verificati. Se zero, scrivi "Nessun gap". (3) SOVRADIMENSIONAMENTO: il manuale ha capitoli che il docente NON usa? Se sì, quanti e quali macro-aree? Questo è un dato operativo per il promotore (il docente paga per contenuti che non usa). (4) GIUDIZIO in una riga: adeguato / sovradimensionato / sottodimensionato.'
  : 'Indice non disponibile. Basandoti solo sul titolo, editore e scenario, descrivi in 2 frasi cosa si può dedurre e segnala il limite dell\'analisi.'}

GAP E OPPORTUNITÀ: ${hasIndice
  ? 'PRIMA i GAP VERIFICATI: temi del programma senza corrispondenza nell\'indice. Se non ce ne sono, scrivi "Nessun gap di contenuto verificato." POI le OPPORTUNITÀ SPECIFICHE per questa cattedra — deducibili SOLO dal testo del programma. Esempi validi: "Il corso prevede 36 ore di esercitazioni su stechiometria → il volume deve avere un forte apparato esercitativo su equilibri e stechiometria." / "Esame scritto con 5 esercizi + 5 domande teoriche → serve un testo con esercizi svolti e domande di autovalutazione." Esempi VIETATI (generici): "il docente potrebbe avere bisogno di risorse digitali" / "materiale aggiornato" / "approccio innovativo".'
  : 'Senza indice, segnala che i gap non sono verificabili. Indica solo opportunità deducibili dal testo integrale del programma.'}

LEVE PER IL CAMBIO: Elenca esattamente 2 leve, numerate. Ogni leva collega un DATO CONCRETO dal programma a una CONSEGUENZA OPERATIVA per il promotore.
Formato: "1. [DATO SPECIFICO] → [AZIONE/ARGOMENTO PER IL PROMOTORE]"
Le leve devono emergere dal testo del programma, NON essere generiche.
Se non ci sono leve credibili, scrivi: "Cattedra con bassa vulnerabilità al cambio: [motivo specifico]. Il promotore può puntare su: [fattore concreto non legato al contenuto]."

REGOLE (la scheda viene SCARTATA se violate):
- ${hasIndice ? 'Ogni affermazione sul manuale DEVE essere verificabile nell\'indice fornito.' : 'NON inventare capitoli o contenuti del manuale.'}
- LEGGI il testo integrale del programma: CFU, ore, esame, obiettivi sono tutti lì. Non ignorarli.
- NON scrivere frasi generiche valide per qualsiasi cattedra
- NON ripetere l'elenco degli argomenti — il promotore li ha già
- Tono: nota operativa interna, diretta, senza retorica. 3-5 frasi per sezione.`;

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
