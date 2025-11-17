import { GoogleGenAI, Modality } from "@google/genai";

// Helper to create a new API client instance.
// This ensures the most up-to-date API key from the aistudio flow is used.
const createApiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generic error handler for API calls
const handleApiError = (error: any, featureName: string): never => {
    console.error(`Error with ${featureName}:`, error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found.")) {
            throw new Error(`مفتاح API المحدد غير صالح. يرجى تحديد مفتاح جديد عبر زر 'مفتاح API' والمحاولة مرة أخرى.`);
        }
        if (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("429")) {
            throw new Error("لقد تجاوزت الحصة المخصصة لك. يرجى التحقق من خطتك وتفاصيل الفوترة.");
        }
        if (error.message.includes("تم حظر إنشاء الصورة")) {
             throw error;
        }
    }
    throw new Error(`فشل في ${featureName}. يرجى المحاولة مرة أخرى لاحقًا.`);
}


export async function generateStory(prompt: string, tone: string, numScenes: number): Promise<string> {
  try {
    const ai = createApiClient();
    const fullPrompt = `اكتب قصة خيالية قصيرة وممتعة باللغة العربية حول: "${prompt}". قسم القصة إلى ${numScenes} مشاهد بالضبط. يجب أن تكون القصة مناسبة لجميع الأعمار، وتحتوي على بداية ووسط ونهاية واضحة، وبأسلوب ${tone}.
لكل مشهد، قم بتقسيمه إلى 3 لقطات بالضبط.
استخدم التنسيق الدقيق التالي لكل مشهد:

**المشهد [رقم]: [عنوان المشهد]**
[اكتب هنا وصفًا سرديًا لأحداث المشهد. استخدم الماركدون: **عريض**، *مائل*، و '> ' للاقتباس.]

**اللقطات:**
- **اللقطة 1:** [وصف بصري مفصل للقطة الأولى مناسب لتوليد صورة. صف التكوين، زاوية الكاميرا، الإضاءة، تعابير الشخصيات، والحركة الرئيسية.]
- **اللقطة 2:** [وصف بصري مفصل للقطة الثانية مناسب لتوليد صورة.]
- **اللقطة 3:** [وصف بصري مفصل للقطة الثالثة مناسب لتوليد صورة.]

**الشخصيات في هذا المشهد:**
- **[اسم الشخصية الأولى]:** [وصف بصري مفصل للشخصية ومظهرها في هذا المشهد.]
- **[اسم الشخصية الثانية]:** [وصف بصري مفصل للشخصية ومظهرها في هذا المشهد.]

إذا لم تكن هناك شخصيات بارزة في مشهد ما، فاترك قسم "الشخصيات في هذا المشهد:" فارغًا أو اكتب "لا يوجد".
التزم بهذا التنسيق بدقة لضمان التحليل الصحيح.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    
    return response.text;
  } catch (error) {
    handleApiError(error, "إنشاء القصة");
  }
}


export async function generateImage(description: string): Promise<string> {
    try {
        const ai = createApiClient();
        const detailedPrompt = `صورة فنية لشخصية خيالية أو مشهد من قصة أطفال. ${description}. أسلوب رسم رقمي، عالي التفاصيل، سينمائي، إضاءة درامية.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: detailedPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:image/png;base64,${base64ImageBytes}`;
                }
            }
        }

        if (response.promptFeedback) {
            console.error("Image generation blocked:", response.promptFeedback);
            throw new Error(`تم حظر إنشاء الصورة. السبب: ${response.promptFeedback.blockReason}`);
        }

        console.error("No image data found in Gemini API response:", response);
        throw new Error("لم يتم العثور على بيانات الصورة في الاستجابة.");

    } catch (error) {
        handleApiError(error, "إنشاء الصورة");
    }
}
