import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
const modelName = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

console.log(`Testing OpenRouter with model ${modelName} and key prefix: ${apiKey?.slice(0, 15)}...`);

async function testOpenRouter() {
  try {
    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://catering-agent.onrender.com',
          'X-Title': 'Dil Se Catering Agent',
        },
      },
      temperature: 0.2,
    });

    console.log('Sending test prompt to OpenRouter...');
    const res = await model.invoke('Say "Hello Dil Se Catering" and confirm you are working!');
    console.log('🎉 OPENROUTER SUCCESS:', res.content);
  } catch (err) {
    console.error('❌ OpenRouter Error:', err.message || err);
  }
}

testOpenRouter();
