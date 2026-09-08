import { createGoogleGenerativeAI } from '@ai-sdk/google';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.warn(
    '[AI SDK] ⚠️  GOOGLE_GENERATIVE_AI_API_KEY chưa được cấu hình hoặc vẫn là placeholder. Hãy cập nhật server/.env để sử dụng Gemini.'
  );
}

export const google = createGoogleGenerativeAI({
  apiKey: apiKey || '',
});
