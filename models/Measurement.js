const mongoose  = require('mongoose')

const measurementSchema = new mongoose.Schema(
    {
        "timestamp": {type: Date,required: true,index: true},
        "temperature": {type:Number, required:true},
        "humidity": {type:Number},
        "windSpeed": {type:Number},
    },
    { versionKey: false }
)

measurementSchema.statics.GetFilterByDateRange = async function ({ field, start, end }) {
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);

    return this.find(
        { timestamp: { $gte: start, $lt: endExclusive } },
        { _id: 0, timestamp: 1, [field]: 1 }
    ).sort({ timestamp: 1 });
}

measurementSchema.statics.GetMetrics= async function({ field, start, end }){
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const result = await this.aggregate([
        { $match: { timestamp: { $gte: start, $lt: endExclusive } } },
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
}

module.exports = mongoose.model('Measurement', measurementSchema);

