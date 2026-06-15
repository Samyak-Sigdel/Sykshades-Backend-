const express = require('express');
const jwt = require('jsonwebtoken');
const Users = require('../models/Users');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

router.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: 'existing user found with same email address' })
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }

    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, process.env.JWT_SECRET)
    res.json({ success: true, token })
})

router.post('/google-login', async (req, res) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken: req.body.token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await Users.findOne({ email });

        if (!user) {
            let cart = {};
            for (let i = 0; i < 300; i++) {
                cart[i] = 0;
            }

            user = new Users({
                name,
                email,
                password: null,
                authProvider: "google",
                cartData: cart,
            });

            await user.save();
        }

        const data = {
            user: { id: user.id }
        };

        const token = jwt.sign(data, process.env.JWT_SECRET);
        res.json({ success: true, token });

    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, errors: "Google authentication failed" });
    }
});

router.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, errors: "Wrong password" });
        }
    } else {
        res.json({ success: false, errors: "Wrong email ID" })
    }
})

module.exports = router;