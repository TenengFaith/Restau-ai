
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-flash-latest",
  generationConfig: { responseMimeType: "application/json" }
});

const analyzeRestaurantsForSafety = async (restaurants, userProfile) => {
  const prompt = `
    User Profile:
    - Diet: ${userProfile.diet_type || 'None'}
    - Allergies: ${JSON.stringify(userProfile.allergies || [])}
    
    Task: Analyze these restaurants and identify the TOP 3 SAFEST options.
    For each, provide a detailed safety breakdown and vibe check.
    If 'menu_link' is available, assume typical dishes for that cuisine.
    
    Restaurants Data:
    ${JSON.stringify(restaurants.slice(0, 10))}
    
    Output JSON format:
    [
      {
        "index": 0, // IMPORTANT: The index of the restaurant in the input array
        "restaurant_name": "Name",
        "safety_score": 1-10,
        "safety_breakdown": {
          "allergen_risk": "Low/Medium/High",
          "cross_contamination_risk": "Low/Medium/High",
          "explanation": "Why..."
        },
        "vibe": "Short description of atmosphere (e.g., Cozy, upscale, lively)",
        "best_for": "Occasion (e.g., Date Night, Quick Lunch)",
        "reasoning": "General explanation...",
        "suggested_dishes": ["Dish 1", "Dish 2"]
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini AI Error:", err.message);
    return [];
  }
};

const summarizeReviews = async (reviews, restaurantName) => {
  const prompt = `
    Restaurant: ${restaurantName}
    Reviews: ${JSON.stringify(reviews)}
    
    Task: Summarize these reviews into a detailed insight report.
    Output JSON format:
    {
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "vibe_check": "What are people saying about the atmosphere?",
      "service_rating": "Good/Bad/Mixed",
      "best_dishes": ["Dish 1", "Dish 2"],
      "avoid": ["Item 1"],
      "note": "Overall summary note"
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini AI Error (Reviews):", err.message);
    return { error: "Failed to summarize" };
  }
};

const assessValue = async (restaurant, reviews) => {
  const prompt = `
    Restaurant: ${restaurant.name}
    Price Level: ${restaurant.price_level}
    Rating: ${restaurant.rating}
    Reviews Sample: ${JSON.stringify(reviews.slice(0, 5))}
    
    Task: Assess value for money and price prediction.
    Output JSON:
    {
      "verdict": "Good/Bad Value",
      "estimated_price_per_person": "e.g., $15-$25",
      "explanation": "Why...",
      "best_for": "Who is this for?"
    }
  `;
     try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    return { error: "Failed to assess value" };
  }
};

const recommendMenu = async (menuItems, preferences, budget) => {
    const prompt = `
    Menu: ${JSON.stringify(menuItems)}
    Preferences: ${JSON.stringify(preferences)}
    Budget: ${budget}
    
    Task: Recommend a 3-course meal.
    Output JSON:
    {
      "starter": "Item",
      "main": "Item",
      "dessert": "Item",
      "total_price": "Estimated",
      "nutrition_note": "Brief health comment",
      "reasoning": "Why this combo?"
    }
    `;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      } catch (err) {
        return { error: "Failed to recommend" };
      }
};

const findHiddenGems = async (restaurants, location) => {
    const prompt = `
    Location: ${location}
    Candidates: ${JSON.stringify(restaurants)}
    
    Task: dynamic analysis for 'Hidden Gems' (underrated, authentic, high rating but low-ish reviews).
    Pick top 5.
    Output JSON:
    [
        { 
          "index": 0, // The index of the restaurant in the input array
          "name": "Name", 
          "gem_factor": "Why it's a gem",
          "vibe": "Quick atmosphere check"
        }
    ]
    `;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      } catch (err) {
        return [];
      }
};

module.exports = {
  analyzeRestaurantsForSafety,
  summarizeReviews,
  assessValue,
  recommendMenu,
  findHiddenGems
};
