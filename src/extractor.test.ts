import { describe, it, expect, vi } from 'vitest';
import { extractChantierData, generateExtractionPrompt } from './extractor';

describe('Chantier Extractor', () => {
  const sampleNotes = "Le mur porteur fissure. Faut que Jean répare ça avant vendredi. On sait pas si l'étanchéité est bonne. L'accès au chantier est bloqué par un camion.";

  it('should generate a prompt containing the rules and notes', () => {
    const prompt = generateExtractionPrompt(sampleNotes);
    expect(prompt).toContain('Never invent data');
    expect(prompt).toContain('Le mur porteur fissure');
    expect(prompt).toContain('"observations": string[]');
  });

  it('should parse the LLM response into a structured JSON object', async () => {
    const mockResponse = JSON.stringify({
      observations: ["Fissure sur le mur porteur."],
      actions: [
        { task: "Réparer la fissure du mur porteur", owner: "Jean", deadline: "Vendredi" }
      ],
      blockers: ["Accès au chantier bloqué par un camion."],
      points_to_verify: ["Vérifier l'étanchéité."]
    });

    const mockLlmCall = vi.fn().mockResolvedValue(mockResponse);

    const result = await extractChantierData(sampleNotes, mockLlmCall);

    expect(mockLlmCall).toHaveBeenCalledWith(generateExtractionPrompt(sampleNotes));
    expect(result.observations).toHaveLength(1);
    expect(result.actions[0].owner).toBe('Jean');
    expect(result.blockers).toContain("Accès au chantier bloqué par un camion.");
    expect(result.points_to_verify).toContain("Vérifier l'étanchéité.");
  });

  it('should clean markdown json blocks from LLM response', async () => {
    const mockResponse = `\`\`\`json\n{
      "observations": ["Test obs"],
      "actions": [],
      "blockers": [],
      "points_to_verify": []
    }\n\`\`\``;

    const mockLlmCall = vi.fn().mockResolvedValue(mockResponse);

    const result = await extractChantierData("test", mockLlmCall);
    expect(result.observations[0]).toBe("Test obs");
  });

  it('should throw an error if the JSON is invalid', async () => {
    const mockLlmCall = vi.fn().mockResolvedValue("Sorry, I don't understand.");

    await expect(extractChantierData("test", mockLlmCall)).rejects.toThrow("Failed to parse");
  });
});
