import { GoogleGenAI, Type } from "@google/genai";
import { AuditRecord, AuditQuestion } from '../types';

const apiKey = process.env.API_KEY || '';

// Helper to clean base64 string if it has data URI prefix
const cleanBase64 = (dataURI: string) => {
  return dataURI.split(',')[1] || dataURI;
};

export const analyzeImageFinding = async (base64Image: string): Promise<string> => {
  if (!apiKey) return "API Key missing.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(base64Image)
            }
          },
          {
            text: "Analyze this image in the context of a Long Term Care facility infection control audit (F880). Describe any potential infection risks or breaches in protocol visible. Keep it brief (under 50 words)."
          }
        ]
      }
    });

    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return "Error analyzing image.";
  }
};

export const generateQAPISummary = async (audit: AuditRecord, questions: AuditQuestion[]): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot generate AI report.";

  // Filter for failures
  const failures = audit.responses.filter(r => r.status === 'fail');
  
  if (failures.length === 0) {
    return "Great job! No deficiencies were noted during this round. Continue monitoring to maintain high standards.";
  }

  // Construct a prompt context
  const failureDetails = failures.map(f => {
    const q = questions.find(qu => qu.id === f.questionId);
    return `- Category: ${q?.category}, Issue: ${q?.text}, Notes: ${f.comment || 'None'}`;
  }).join('\n');

  const prompt = `
    You are an expert Infection Preventionist and QAPI consultant for Long Term Care.
    Review the following failed items from a "Process Round" audit conducted at ${audit.facilityName} - ${audit.location}.
    
    Failures:
    ${failureDetails}

    Please provide a concise QAPI summary (approx 150 words) that:
    1. Identifies the primary root cause themes (e.g., lack of supplies, behavioral drift, training gap).
    2. Cites the relevance to CMS Tag F880 (Infection Control).
    3. Suggests 3 specific actionable interventions for the QAPI plan.
    
    Format as valid Markdown.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    return "Error communicating with AI service.";
  }
};