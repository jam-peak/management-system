import { ai } from './src/lib/ai';

async function testGemini() {
  try {
    console.log('Testing Gemini AI integration...');
    const response = await ai('Return exactly: [10,20,30,40,50,60,70,80,90,100,15,25,35,45,55,65,75,85,95,5,10,20,30,40,50,60,70,80,90,100,15,25,35,45,55,65,75,85,95,5,10,20,30,40,50,60,70,80]');
    const result = await response.json();
    console.log('✅ Gemini AI Response:', result.choices[0].message.content);
    console.log('✅ Integration working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();