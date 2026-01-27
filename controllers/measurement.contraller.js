const Measurement =require('../models/measurement')

exports.getSeries = async (req, res) => {
    try {
        const { field } = req.query;
        const { start, end } = req.filter;

        const points = await Measurement.GetFilterByDateRange({ field, start, end });

        return res.json(points);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

exports.getMetrics = async (req, res) => {
    try {
        const { field } = req.query;
        const { start, end } = req.filter;

        const metrics = await Measurement.GetMetrics({ field, start, end });

        return res.json(metrics ?? { avg: null, min: null, max: null, stdDev: null });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}