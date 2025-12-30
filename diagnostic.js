const externalApis = require('./services/externalApis');
const gemini = require('./services/gemini');

async function fullDiagnostic() {
  console.log('--- Starting Full Search Diagnostic ---');
  const userProfile = { diet_type: 'Vegan', allergies: [] };
  const location = 'Lagos';
  const query = 'pizza restaurants';

  try {
    console.log('1. Fetching from SerpAPI...');
    const restaurants = await externalApis.searchRestaurants(location, query);
    console.log('Results Count:', restaurants.length);

    if (restaurants.length === 0) {
      console.log('FAILURE: SerpAPI returned 0 results.');
      return;
    }

    console.log('2. Analyzing with Gemini...');
    const aiAnalysis = await gemini.analyzeRestaurantsForSafety(restaurants, userProfile);
    console.log('AI Analysis Results:', JSON.stringify(aiAnalysis, null, 2));

    if (!aiAnalysis || aiAnalysis.length === 0) {
      console.log('FAILURE: Gemini returned 0 analysis items.');
      return;
    }

    console.log('3. Merging results...');
    const results = aiAnalysis.map(aiResult => {
      const sourceIndex = typeof aiResult.index !== 'undefined' ? Number(aiResult.index) : -1;
      let source = restaurants[sourceIndex];
      
      if (!source && aiResult.restaurant_name) {
        source = restaurants.find(r => 
          r.name.toLowerCase().includes(aiResult.restaurant_name.toLowerCase()) ||
          aiResult.restaurant_name.toLowerCase().includes(r.name.toLowerCase())
        );
      }

      console.log(`Merging ${aiResult.restaurant_name}: ${source ? 'SUCCESS' : 'FAILED'}`);
      return {
        ...(source || {}),
        ...aiResult,
        name: source ? source.name : aiResult.restaurant_name
      };
    }).filter(item => item.name);

    console.log('Final Results Count:', results.length);
  } catch (error) {
    console.error('DIAGNOSTIC CRASH:', error);
  }
  console.log('--- Diagnostic Complete ---');
}

fullDiagnostic();
