import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const model = new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName,
      temperature: 0.2,
    });
    const res = await model.invoke('Say "Hello Dil Se Catering"');
    console.log(`✅ SUCCESS with ${modelName}:`, res.content);
    return true;
  } catch (err) {
    console.log(`❌ Failed with ${modelName}:`, err.message);
    return false;
  }
}

async function run() {
  await testModel('gemini-3.8-flash');
}

run();
