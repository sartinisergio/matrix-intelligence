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
function getTargetMotivationPrompt(bookData, targetData) {
  let frameworkContext = '';
  if (targetData.profilo_classe) {
    frameworkContext = `\nPROFILO CLASSE DI LAUREA (dal framework disciplinare MATRIX):\n${targetData.profilo_classe}\n`;
  }
  if (targetData.framework_score !== undefined) {
    frameworkContext += `\nALLINEAMENTO FRAMEWORK: ${targetData.framework_score}% dei moduli disciplinari coperti dal programma del docente.\n`;
  }

  return `Sei un consulente commerciale esperto per la casa editrice Zanichelli.
Devi spiegare in 2-3 frasi CONCRETE perché un docente universitario dovrebbe considerare il nuovo libro proposto.

REGOLE:
- Sii specifico: menziona il manuale attuale del docente, le lacune che il nuovo libro colma, i punti di forza
- Se il docente NON usa Zanichelli (scenario "assente"), sottolinea i vantaggi rispetto al concorrente attuale
- Se il docente USA GIA' Zanichelli (scenario "principale" o "alternativo"), suggerisci aggiornamento/complemento
- Se c'e un profilo classe di laurea, menziona l'aderenza ai requisiti del corso di studi
- Nessun titolo, nessuna formattazione, solo 2-3 frasi dirette

NUOVO LIBRO:
- Titolo: ${bookData.titolo}
- Autore: ${bookData.autore || 'N/D'}
- Materia: ${bookData.materia}
- Temi chiave: ${(bookData.temi || []).join(', ')}

DOCENTE TARGET:
- Nome: ${targetData.docente_nome || 'N/D'}
- Ateneo: ${targetData.ateneo || 'N/D'}
- Materia insegnata: ${targetData.materia_inferita || 'N/D'}
- Classe di laurea: ${targetData.classe_laurea || 'N/D'}
- Temi del corso: ${(targetData.temi_principali || []).join(', ')}
- Manuale attuale: ${targetData.manuale_attuale || 'N/D'}
- Scenario Zanichelli: ${targetData.scenario_zanichelli || 'N/D'}
${frameworkContext}
Rispondi con esattamente 2-3 frasi. Nessun titolo, nessuna formattazione.`;
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
    'Sei un consulente commerciale esperto del settore editoriale universitario.',
    prompt,
    false
  );
  return result.trim();
}
