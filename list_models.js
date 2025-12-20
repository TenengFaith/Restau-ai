
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    console.log(`Querying https://generativelanguage.googleapis.com/v1beta/models?key=...`);
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const models = response.data.models;
    console.log('Available Models:');
    models.forEach(m => {
        if (m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent')) {
            console.log(`- ${m.name}`);
        }
    });
  } catch (error) {
    console.error('Failed to list models:', error.response ? error.response.data : error.message);
  }
}

listModels();
