import 'dotenv/config';

console.log('Key loaded:', process.env.GROQ_API_KEY ? 'YES, starts with ' + process.env.GROQ_API_KEY.slice(0, 8) : 'NO - undefined');

import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function test() {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
    max_tokens: 50,
  });
  console.log(completion.choices[0]?.message?.content);
}

test();