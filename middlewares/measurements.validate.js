const allowedFields = new Set(['temperature', 'humidity', 'windSpeed']);

function parseISODateOnly(s) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function validateQuery(req, res, next) {
    const { field, start_date, end_date } = req.query;

    if (!allowedFields.has(field)) {
        return res.status(400).json({ error: 'Invalid field. Use: temperature, humidity, windSpeed' });
    }

    const start = parseISODateOnly(start_date);
    const end = parseISODateOnly(end_date);

    if (!start || !end || start > end) {
        return res.status(400).json({ error: 'Invalid date range. Use YYYY-MM-DD and start_date <= end_date' });
    }

    req.filter = { start, end };

    next();
}

module.exports = { validateQuery };
