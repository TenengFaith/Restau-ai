const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// --- REVIEWS ---

// 1. Post a Review
router.post('/reviews', async (req, res) => {
  const { user_id, restaurant_name, rating, comment } = req.body;
  try {
    const { data, error } = await supabase
      .from('app_reviews')
      .insert([{ user_id, restaurant_name, rating, comment }])
      .select();
      
    if (error) throw error;
    res.json({ message: "Review posted", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to post review" });
  }
});

// 2. Get Reviews for a Restaurant
router.get('/reviews/:restaurantName', async (req, res) => {
  const { restaurantName } = req.params;
  try {
    const { data, error } = await supabase
      .from('app_reviews')
      .select('*, user:user_id(email)') // Assume user_id links to auth.users, might need public profile table for names
      .eq('restaurant_name', restaurantName)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// --- COLLECTIONS ---

// 3. Create a Collection
router.post('/collections', async (req, res) => {
  const { user_id, name, description, is_public } = req.body;
  try {
    const { data, error } = await supabase
      .from('collections')
      .insert([{ user_id, name, description, is_public }])
      .select();
    
    if (error) throw error;
    res.json({ message: "Collection created", data });
  } catch (error) {
    res.status(500).json({ error: "Failed to create collection" });
  }
});

// 4. Get User Collections
router.get('/collections/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// 5. Add Item to Collection
router.post('/collections/item', async (req, res) => {
  const { collection_id, restaurant_name } = req.body;
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert([{ collection_id, restaurant_name }])
      .select();
      
    if (error) throw error;
    res.json({ message: "Added to collection", data });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

// 6. Get Collection Items
router.get('/collections/:collectionId/items', async (req, res) => {
  const { collectionId } = req.params;
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

module.exports = router;
