
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
    For each, explain WHY it is safe or suitable based on the name, description, and cuisine.
    If 'menu_link' is available, assume typical dishes for that cuisine.
    
    Restaurants Data:
    ${JSON.stringify(restaurants.slice(0, 10))} // Limit to 10 to fit context if needed
    
    Output JSON format:
    [
      {
        "restaurant_name": "Name",
        "safety_score": 1-10,
        "reasoning": "Explanation...",
        "suggested_dishes": ["Dish 1", "Dish 2"]
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    // Clean code blocks if present
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
    
    Task: Summarize these reviews.
    Output JSON format:
    {
      "pros": ["Pro 1 (count)", "Pro 2 (count)", "Pro 3 (count)"],
      "cons": ["Con 1 (count)", "Con 2 (count)", "Con 3 (count)"],
      "best_dishes": ["Dish 1", "Dish 2", "Dish 3"],
      "avoid": ["Item 1", "Item 2"]
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
    
    Task: Assess value for money.
    Output JSON:
    {
      "verdict": "Good/Bad Value",
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
    // Filter logic might happen before, but AI can refine
    const prompt = `
    Location: ${location}
    Candidates: ${JSON.stringify(restaurants)}
    
    Task: dynamic analysis for 'Hidden Gems' (underrated, authentic, high rating but low-ish reviews).
    Pick top 5.
    Output JSON:
    [
        { "name": "Name", "gem_factor": "Why it's a gem" }
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
