require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware JSON
app.use(bodyParser.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple auth middleware (check API key)
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Apply auth middleware globally
app.use(authMiddleware);

// In-memory product storage
let products = [];

// Validation middleware
const validateProduct = (req, res, next) => {
  const { name, price, description, category, inStock } = req.body;
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ message: 'Invalid product data' });
  }
  next();
};

// Routes

// GET /api/products - list all products with optional filter/pagination
app.get('/api/products', (req, res) => {
  let result = [...products];

  // Filter by category
  if (req.query.category) {
    result = result.filter(p => p.category === req.query.category);
  }

  // Search by name
  if (req.query.q) {
    result = result.filter(p => p.name.toLowerCase().includes(req.query.q.toLowerCase()));
  }

  // Pagination
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;

  const paginated = result.slice(start, end);
  res.json({
    total: result.length,
    page,
    limit,
    data: paginated
  });
});

// GET /api/products/:id - get product by ID
app.get('/api/products/:id', (req, res, next) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return next(new Error('Product not found'));
  res.json(product);
});

// POST /api/products - create a new product
app.post('/api/products', validateProduct, (req, res) => {
  const { name, description, price, category, inStock } = req.body;
  const newProduct = { id: uuidv4(), name, description, price, category, inStock };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT /api/products/:id - update product
app.put('/api/products/:id', validateProduct, (req, res, next) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return next(new Error('Product not found'));
  products[index] = { ...products[index], ...req.body };
  res.json(products[index]);
});

// DELETE /api/products/:id - delete product
app.delete('/api/products/:id', (req, res, next) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return next(new Error('Product not found'));
  const deleted = products.splice(index, 1);
  res.json(deleted[0]);
});

// Global error handler
app.use((err, req, res, next) => {
  res.status( err.message === 'Product not found' ? 404 : 500 )
     .json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
