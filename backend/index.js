const port = process.env.PORT || 4000;
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const cartRoutes = require('./routes/cart');
const esewaRouter = require('./routes/esewa');

// 1. CORS — must be first
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow all vercel.app subdomains + explicit origins
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'auth-token'],
  credentials: true,
}));

// 2. Body parser — must be before routes
app.use(express.json());

// 3. Static files
app.use('/images', express.static('upload/images'));

// 4. DB
connectDB();

// 5. Routes
app.get("/", (req, res) => {
    res.send("Express App is Running")
})

app.use('/esewa', esewaRouter);
app.use('/', productRoutes);
app.use('/', userRoutes);
app.use('/', cartRoutes);

app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on port " + port);
    } else {
        console.log("Error :" + error);
    }
})