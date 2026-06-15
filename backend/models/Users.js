const mongoose = require('mongoose');

const Users = mongoose.model('Users', {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    authProvider: { type: String, default: "local" },
    cartData: { type: Object },
    date: { type: Date, default: Date.now }
})

module.exports = Users;