const express = require('express');
const multer = require("multer");
const path = require("path");
const Product = require('../models/Product');

const router = express.Router();

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({ storage: storage });

router.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${process.env.PORT}/images/${req.file.filename}`
    })
})

router.post('/addproduct', async (req, res) => {
    try {
        const products = await Product.find({});

        // Use Math.max across ALL existing ids — safe even after deletions
        const id = products.length > 0
            ? Math.max(...products.map(p => p.id)) + 1
            : 1;

        const product = new Product({
            id,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            subcategory: req.body.subcategory,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
        });

        console.log(product);
        await product.save();
        console.log("Saved");

        res.json({ success: true, name: req.body.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
})

router.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({ success: true, name: req.body.name })
})

router.get('/allproduct', async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

router.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

router.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" });
    let popular_in_women = products.slice(0, 4);
    console.log("Popular in Women Fetched");
    res.send(popular_in_women);
})

module.exports = router;