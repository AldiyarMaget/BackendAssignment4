const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
    {
        timestamp: { type: Date, required: true, index: true },
        temperature: { type: Number, required: true },
        humidity: { type: Number },
        windSpeed: { type: Number },
    },
    { versionKey: false }
);

measurementSchema.statics.GetFilterByDateRange = async function ({ field, start, end }) {
    const startDate = new Date(start);
    const endExclusive = new Date(end);

    return this.find(
        { timestamp: { $gte: startDate, $lt: endExclusive } },
        { _id: 0, timestamp: 1, [field]: 1 }
    ).sort({ timestamp: 1 });
};

measurementSchema.statics.GetMetrics = async function ({ field, start, end }) {
    const startDate = new Date(start);
    const endExclusive = new Date(end);

    const result = await this.aggregate([
        { $match: { timestamp: { $gte: startDate, $lt: endExclusive } } },
        {
            $group: {
                _id: null,
                avg: { $avg: `$${field}` },
                min: { $min: `$${field}` },
                max: { $max: `$${field}` },
                stdDev: { $stdDevPop: `$${field}` }
            }
        },
        { $project: { _id: 0, avg: 1, min: 1, max: 1, stdDev: 1 } }
    ]);

    return result[0] ?? null;
};

module.exports = mongoose.model('Measurement', measurementSchema);
