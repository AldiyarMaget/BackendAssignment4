const allowedFields = new Set(['temperature', 'humidity', 'windSpeed']);

function parseYmdToLocalMidnight(ymd) {
    if (typeof ymd !== 'string') return null;

    const [yyyy, mm, dd] = ymd.split('-').map(Number);
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;

    const d = new Date(yyyy, mm - 1, dd);
    d.setHours(0, 0, 0, 0);
    return d;
}

function validateQuery(req, res, next) {
    const { field, start_date, end_date, startMs, endExclusiveMs } = req.query;

    if (!allowedFields.has(field)) {
        return res.status(400).json({ error: 'Invalid field. Use: temperature, humidity, windSpeed' });
    }

    if (startMs !== undefined || endExclusiveMs !== undefined) {
        const s = Number(startMs);
        const e = Number(endExclusiveMs);

        if (!Number.isFinite(s) || !Number.isFinite(e)) {
            return res
                .status(400)
                .json({ error: 'Invalid date range. Use numeric startMs and endExclusiveMs (ms).' });
        }

        const start = new Date(s);
        const end = new Date(e);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
            return res.status(400).json({ error: 'Invalid date range. Use startMs < endExclusiveMs.' });
        }

        req.filter = { start, end };
        return next();
    }

    const start = parseYmdToLocalMidnight(start_date);
    const endInclusive = parseYmdToLocalMidnight(end_date);

    if (!start || !endInclusive || start > endInclusive) {
        return res.status(400).json({ error: 'Invalid date range. Use YYYY-MM-DD and start_date <= end_date' });
    }

    const end = new Date(endInclusive);
    end.setDate(end.getDate() + 1);

    req.filter = { start, end };
    next();
}

module.exports = { validateQuery };
