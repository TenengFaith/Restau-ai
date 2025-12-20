
const externalApis = require('./services/externalApis');
const gemini = require('./services/gemini');
require('dotenv').config();

async function runDiagnostics() {
  console.log('--- Checking Env Vars ---');
  console.log('SERP_API_KEY present:', !!process.env.SERP_API_KEY);
  console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

  console.log('\n--- Testing SerpAPI ---');
  let restaurants = [];
  try {
    restaurants = await externalApis.searchRestaurants('Accra', 'vegetarian restaurants');
    console.log(`Found ${restaurants.length} restaurants via SerpAPI.`);
  } catch (error) {
    console.error('SerpAPI Test Failed:', error.message);
  }

  if (restaurants.length === 0) {
    console.log('Using mock restaurants for Gemini.');
    restaurants = [{ name: "Test Place", rating: 4.5, cuisine: "Vegetarian" }];
  }

  console.log('\n--- Testing Gemini Service (using gemini-2.0-flash) ---');
  try {
    const userProfile = { diet_type: 'vegetarian', allergies: ['peanuts'] };
    // This calls the service which uses the configured model
    const analysis = await gemini.analyzeRestaurantsForSafety(restaurants, userProfile);
    console.log('Gemini Analysis Result (First Item):');
    if (Array.isArray(analysis) && analysis.length > 0) {
        console.log(JSON.stringify(analysis[0], null, 2));
    } else {
        console.log('Result:', JSON.stringify(analysis));
    }
  } catch (error) {
    console.error('Gemini Service Test Failed:', error.message);
  }
}

runDiagnostics();
