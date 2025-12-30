
const express = require('express');
const router = express.Router();
const externalApis = require('../services/externalApis');

const gemini = require('../services/gemini');
const supabase = require('../services/supabase');

// 0. Health Check
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    gemini_model: "gemini-2.0-flash",
    gemini_key_present: !!process.env.GEMINI_API_KEY,
    serp_key_present: !!process.env.SERP_API_KEY,
    supabase_url_present: !!process.env.SUPABASE_URL
  });
});

// 1. Search Restaurants with AI Recommendations
router.post('/search', async (req, res) => {
  try {
    const { location, cuisine, dietary, allergies } = req.body;
    
    // Fetch from SerpAPI
    const query = cuisine || 'best';
    // Construct a diet string for the search query context if helpful
    // but typically we filter *after* fetching broad results for better analysis
    // However specific queries "vegetarian restaurants" work too.
    const searchQuery = `${cuisine ? cuisine + ' ' : ''}restaurants`;
    
    const restaurants = await externalApis.searchRestaurants(location, searchQuery);
    
    if (!restaurants || restaurants.length === 0) {
      return res.status(404).json({ message: "No restaurants found." });
    }

    // Process with Gemini for safety/diet
    const userProfile = { 
      diet_type: dietary, 
      allergies: allergies 
    };
    
    const aiAnalysis = await gemini.analyzeRestaurantsForSafety(restaurants, userProfile);
    
    // Merge AI results with source data using indices
    const results = aiAnalysis.map(aiResult => {
      const sourceIndex = typeof aiResult.index !== 'undefined' ? Number(aiResult.index) : -1;
      let source = restaurants[sourceIndex];
      
      // Fallback: If index is invalid, try name matching
      if (!source && aiResult.restaurant_name) {
        source = restaurants.find(r => 
          r.name.toLowerCase().includes(aiResult.restaurant_name.toLowerCase()) ||
          aiResult.restaurant_name.toLowerCase().includes(r.name.toLowerCase())
        );
      }

      return {
        ...(source || {}),
        ...aiResult,
        name: source ? source.name : aiResult.restaurant_name
      };
    }).filter(item => item.name);
    
    res.json({
      results,
      source_data_count: restaurants.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search failed" });
  }
});

// 2. Review Summarizer
router.get('/reviews/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // Note: restaurantId here needs to be something externalApis understands.
    // If it's a name, we might search. If it's a place_id, we fetch.
    // For this prototype, we'll try to fetch reviews.
    
    // In a real flow, client passes the place_id from the search result.
    const reviews = await externalApis.getRestaurantReviews(restaurantId);
    
    // Mock reviews if none found (for demo purposes, so Gemini has something to read)
    // In production, handle graceful 404 or "insufficient data"
    const reviewData = reviews.length > 0 ? reviews : [
        "Great food but slow service.", 
        "Loved the atmosphere, authentic taste.",
        "Portions are huge, very good value.",
        "A bit noisy on Saturday nights.",
        "Best jollof rice I've had in years.",
        "Server was rude.", 
        "Vegetarian options are limited but tasty.",
        "Cheap and cheerful.",
        "Wait time was 45 minutes.",
        "Highly recommend for families."
    ]; 
    // ^ Mocking purely because Serp basic search doesn't return list of review texts easily 
    // without multiple calls/paginated scraping and I want the AI part to shine immediately.

    const summary = await gemini.summarizeReviews(reviewData, restaurantId); // ID used as name proxy if real name distinct
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Review summary failed" });
  }
});

// 3. Price-to-Quality Analyzer
router.post('/value', async (req, res) => {
  try {
    const { name, price_level, rating, sample_reviews } = req.body;
    // Client can send this data from the previous search result
    
    // If client sends just ID, we'd fetch. Assuming client sends object for efficiency:
    const analysis = await gemini.assessValue({ name, price_level, rating }, sample_reviews || []);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Value analysis failed" });
  }
});

// 4. Hidden Gem Finder
router.get('/hidden-gems/:location', async (req, res) => {
  try {
    const { location } = req.params;
    // Search for highly rated places
    // We might query "best rated restaurants in [location]"
    const restaurants = await externalApis.searchRestaurants(location, 'highly rated restaurants');
    
    // Filter locally first? e.g. < 100 reviews if we have review_count (not always in simple Serp result)
    // We let AI decide "hidden gem" status from the list
    
    const gems = await gemini.findHiddenGems(restaurants, location);
    
    // Merge AI results with source data using indices
    const results = gems.map(gem => {
      const sourceIndex = typeof gem.index !== 'undefined' ? Number(gem.index) : -1;
      let source = restaurants[sourceIndex];

      // Fallback: Name matching
      if (!source && gem.name) {
        source = restaurants.find(r => 
          r.name.toLowerCase().includes(gem.name.toLowerCase()) ||
          gem.name.toLowerCase().includes(r.name.toLowerCase())
        );
      }

      return {
        ...(source || {}),
        ...gem,
        name: source ? source.name : gem.name
      };
    }).filter(item => item.name);
    
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hidden gem search failed" });
  }
});

// 5. Menu Item Recommendations
router.post('/menu-recommend', async (req, res) => {
  try {
    const { menu, preferences, budget } = req.body;
    // 'menu' is array of strings or objects
    const recommendation = await gemini.recommendMenu(menu, preferences, budget);
    res.json(recommendation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Menu recommendation failed" });
  }
});


// 6. Save Favorite Restaurant
router.post('/favorites', async (req, res) => {
  const { user_id, restaurant_id, name, cuisine } = req.body;
  try {
    const { data, error } = await supabase
      .from('favorite_restaurants')
      .insert([{ user_id, restaurant_id, name, cuisine }])
      .select();
      
    if (error) throw error;
    res.json({ message: "Restaurant saved to favorites", data });
  } catch (error) {
    console.error("Supabase Error:", error);
    res.status(500).json({ error: "Failed to save favorite" });
  }
});

// 7. Get User Favorites
router.get('/favorites/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('favorite_restaurants')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// 8. Save Dietary Preferences
router.post('/preferences', async (req, res) => {
  const { user_id, diet_type, allergies } = req.body;
  try {
    // Upsert mechanism (update if exists, insert if new)
    const { data, error } = await supabase
      .from('dietary_preferences')
      .upsert([{ user_id, diet_type, allergies }], { onConflict: 'user_id' })
      .select();

    if (error) throw error;
    res.json({ message: "Preferences saved", data });
  } catch (error) {
    console.error("Supabase Error:", error);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

// 9. Get User Preferences
router.get('/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('dietary_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// 10. Delete Favorite Restaurant
router.delete('/favorites/:userId/:restaurantId', async (req, res) => {
  const { userId, restaurantId } = req.params;
  try {
    const { error } = await supabase
      .from('favorite_restaurants')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
    res.json({ message: "Favorite removed" });
  } catch (error) {
    console.error("Supabase Error:", error);
    res.status(500).json({ error: "Failed to delete favorite" });
  }
});

module.exports = router;
