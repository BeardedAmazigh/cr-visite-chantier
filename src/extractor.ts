export interface ChantierAction {
  task: string;
  owner: string;
  deadline: string;
}

export interface ExtractedChantierData {
  observations: string[];
  actions: ChantierAction[];
  blockers: string[];
  points_to_verify: string[];
}

export const generateExtractionPrompt = (notes: string): string => {
  return `
You are an expert construction site assistant. Generate a structured JSON report from the following unstructured notes.

Rules:
- Separate facts from interpretation.
- Do not assume compliance.
- Keep professional tone.
- Use clear and short sentences.
- Always identify actions, owners, and deadlines.
- Never invent data.
- If information is missing for an action owner or deadline, output "à vérifier".
- The output MUST be valid JSON matching exactly the following TypeScript interface, with no additional text or markdown:
{
  "observations": string[],
  "actions": [ { "task": string, "owner": string, "deadline": string } ],
  "blockers": string[],
  "points_to_verify": string[]
}
All text content in the JSON should be in French.

Notes:
${notes}
`.trim();
};

export const extractChantierData = async (
  notes: string,
  llmCall: (prompt: string) => Promise<string>
): Promise<ExtractedChantierData> => {
  const prompt = generateExtractionPrompt(notes);
  const rawResponse = await llmCall(prompt);
  
  // Clean markdown blocks if the LLM adds them
  const cleaned = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
    
  try {
    const data = JSON.parse(cleaned) as ExtractedChantierData;
    return data;
  } catch (error) {
    throw new Error('Failed to parse LLM response as JSON. Response was: ' + cleaned);
  }
};
