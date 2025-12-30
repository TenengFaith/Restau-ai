const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "API is running!" });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API /api is working!" });
});

// Import routes here
const foodRoutes = require('./routes/food');
const socialRoutes = require('./routes/social');

app.use('/api/food', foodRoutes);
app.use('/api/social', socialRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
