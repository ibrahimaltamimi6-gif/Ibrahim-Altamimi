import { GoogleGenAI } from "@google/genai";

export async function generateStory(prompt: string, tone: string): Promise<string> {
  // IMPORTANT: The API key must be set in the environment variable `process.env.API_KEY`
  if (!process.env.API_KEY) {
    throw new Error("API key not found. Please set the API_KEY environment variable.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `اكتب قصة خيالية قصيرة وممتعة باللغة العربية حول: "${prompt}". قسم القصة إلى 3-5 مشاهد على الأقل. يجب أن تكون القصة مناسبة لجميع الأعمار، وتحتوي على بداية ووسط ونهاية واضحة، وبأسلوب ${tone}. استخدم التنسيق التالي لكل مشهد:

**المشهد [رقم]: [عنوان المشهد]**
[وصف أحداث المشهد هنا]

استخدم تنسيق الماركدون داخل وصف المشهد: **للنص العريض**، *للنص المائل*، '> ' للاقتباسات أو الحوارات.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating story with Gemini API:", error);
    throw new Error("فشل في إنشاء القصة. يرجى التحقق من اتصالك أو المحاولة مرة أخرى لاحقًا.");
  }
}