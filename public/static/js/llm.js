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

// --- Prompt Motivazione Target (FASE COMPLETA — con indice del volume) ---
// Chiamato SOLO quando abbiamo temi/indice REALI del volume.
function getTargetMotivationPrompt(bookData, targetData) {
  // Contesto framework
  let frameworkContext = '';
  if (targetData.framework_score !== undefined && targetData.framework_score > 0) {
    frameworkContext += `\n- Copertura framework disciplinare: ${targetData.framework_score}%`;
    if (targetData.framework_moduli_coperti && targetData.framework_moduli_coperti.length > 0) {
      frameworkContext += ` (moduli: ${targetData.framework_moduli_coperti.slice(0, 5).join(', ')})`;
    }
  }
  if (targetData.profilo_classe) {
    frameworkContext += `\n- Profilo classe di laurea: ${targetData.profilo_classe}`;
  }
  if (targetData.temi_comuni_framework && targetData.temi_comuni_framework.length > 0) {
    frameworkContext += `\n- Temi in comune con framework: ${targetData.temi_comuni_framework.slice(0, 6).join(', ')}`;
  }
  if (targetData.overlap_pct > 0) {
    frameworkContext += `\n- Overlap tematico: ${targetData.overlap_pct}%`;
  }

  // Info libro
  const hasTemi = bookData.temi && bookData.temi.length > 0;
  let bookInfo = `NUOVO VOLUME ZANICHELLI (in fase di lancio):
- Titolo: ${bookData.titolo}
- Autore: ${bookData.autore || 'N/D'}
- Materia: ${bookData.materia}`;
  if (hasTemi) {
    bookInfo += `\n- Argomenti trattati (dal sommario): ${bookData.temi.join(', ')}`;
  }

  // Manuali complementari
  const manualiCompl = targetData.manuali_complementari && targetData.manuali_complementari !== 'Nessuno'
    ? `\n- Manuali complementari: ${targetData.manuali_complementari}` : '';

  return `Sei un consulente commerciale per la casa editrice Zanichelli.
Stai preparando una NOTA OPERATIVA per un promotore editoriale che deve visitare un docente.

OBIETTIVO: Il promotore deve capire in 30 secondi:
1. Cosa adotta oggi questo docente (concorrente? Zanichelli? niente?)
2. Su quali argomenti del programma si puo fare leva
3. Quale azione commerciale specifica intraprendere

REGOLE:
- Basa TUTTO sui dati forniti: programma, manuali citati, scenario, framework
- NON inventare contenuti o caratteristiche del nuovo libro
- Nomina SEMPRE il manuale concorrente per nome se c'e
- Cita 2-3 temi specifici del programma del docente come aggancio
- Chiudi con l'azione: confronto diretto, sostituzione, affiancamento, aggiornamento
- Scrivi 3-4 frasi operative, tono da nota interna commerciale

${bookInfo}

DOCENTE TARGET:
- Nome: ${targetData.docente_nome || 'N/D'}
- Ateneo: ${targetData.ateneo || 'N/D'}
- Materia insegnata: ${targetData.materia_inferita || 'N/D'}
- Classe di laurea: ${targetData.classe_laurea || 'N/D'}
- Temi del programma: ${(targetData.temi_principali || []).join(', ') || 'N/D'}
- Manuale principale adottato: ${targetData.manuale_attuale || 'Nessun manuale citato'}${manualiCompl}
- Scenario Zanichelli: ${targetData.scenario_zanichelli || 'N/D'}${frameworkContext}

Rispondi con 3-4 frasi concrete. Nessun titolo, nessuna formattazione markdown.`; 
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
  const result = await callOpenAI(
    'Sei un consulente commerciale esperto del settore editoriale universitario. Basa le tue risposte solo sui dati forniti, non inventare informazioni.',
    prompt,
    false
  );
  return result.trim();
}
