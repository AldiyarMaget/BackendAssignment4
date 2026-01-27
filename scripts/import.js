const path = require('path');
require('dotenv').config({path: path.resolve(__dirname, '../.env')});
const mongoose = require('mongoose');
const fs = require('fs');

const Measurement = require('../models/measurement');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const raw = fs.readFileSync('csvjson.json', 'utf8');
    const docs = JSON.parse(raw);
    const prepared = docs.map(d => ({
        ...d,
        timestamp: new Date(d.timestamp)
    }));

    await Measurement.insertMany(prepared);
    console.log('Inserted:', prepared.length);

    await mongoose.disconnect();
})();
