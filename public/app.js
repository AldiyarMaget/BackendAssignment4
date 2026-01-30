const form = document.getElementById('form');
const btn = document.getElementById('btn');
const btnReset = document.getElementById('btnReset');

const fieldEl = document.getElementById('field');
const startEl = document.getElementById('start_date');
const endEl = document.getElementById('end_date');
const chartTypeEl = document.getElementById('chartType');

const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');

const avgEl = document.getElementById('avg');
const minEl = document.getElementById('min');
const maxEl = document.getElementById('max');
const stdDevEl = document.getElementById('stdDev');

const canvas = document.getElementById('chart');

let chartInstance = null;

function setStatus(text, type = 'info') {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('error', type === 'error');
}

function fmtNumber(v) {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(2);
}

function buildUrl(path, params) {
    const u = new URL(path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        u.searchParams.set(k, String(v));
    });
    return u.toString();
}

function clearUI() {
    avgEl.textContent = '—';
    minEl.textContent = '—';
    maxEl.textContent = '—';
    stdDevEl.textContent = '—';
    countEl.textContent = 'Points: —';
}

function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

function renderChart({ chartType, field, points, startMs, endExclusiveMs }) {
    const labelMap = {
        temperature: 'Temperature',
        humidity: 'Humidity',
        windSpeed: 'Wind speed'
    };

    const isLine = chartType === 'line';

    const data = {
        datasets: [
            {
                label: labelMap[field] || field,
                data: points,
                borderColor: 'rgba(116, 199, 255, 0.95)',
                backgroundColor: isLine
                    ? 'rgba(116, 199, 255, 0.18)'
                    : 'rgba(116, 199, 255, 0.55)',

                tension: isLine ? 0.35 : 0,
                cubicInterpolationMode: isLine ? 'monotone' : undefined,

                spanGaps: isLine ? true : undefined,

                pointRadius: isLine ? 0 : 0,
                pointHoverRadius: 4,
                borderWidth: isLine ? 2 : 1,
                fill: isLine
            }
        ]
    };

    const options = {
        parsing: false,
        normalized: true,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.2,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
            legend: { labels: { color: 'rgba(234, 244, 255, 0.85)' } },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${fmtNumber(ctx.parsed.y)}`
                }
            }
        },
        scales: {
            x: {
                type: 'timeseries',
                min: Number.isFinite(startMs) ? startMs : undefined,
                max: Number.isFinite(endExclusiveMs) ? endExclusiveMs : undefined,
                ticks: { color: 'rgba(234, 244, 255, 0.65)' },
                grid: { color: 'rgba(116, 199, 255, 0.12)' }
            },
            y: {
                ticks: { color: 'rgba(234, 244, 255, 0.65)' },
                grid: { color: 'rgba(116, 199, 255, 0.12)' }
            }
        }
    };

    destroyChart();
    chartInstance = new Chart(canvas, { type: chartType, data, options });
}

async function fetchJsonOrThrow(url, label) {
    const res = await fetch(url);
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`${label} error ${res.status}. ${t}`);
    }
    return res.json();
}

function dateInputToLocalStartMs(dateStr) {
    if (!dateStr) return NaN;
    const [yyyy, mm, dd] = String(dateStr).split('-').map(Number);
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return NaN;

    const d = new Date(yyyy, mm - 1, dd);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function addDaysMs(ms, days) {
    const d = new Date(ms);
    d.setDate(d.getDate() + days);
    return d.getTime();
}

function parseTimestampToMs(tsRaw) {
    if (tsRaw === null || tsRaw === undefined) return NaN;

    if (typeof tsRaw === 'number') return tsRaw;

    if (tsRaw instanceof Date) return tsRaw.getTime();

    const s = String(tsRaw);

    const iso = Date.parse(s);
    if (Number.isFinite(iso)) return iso;

    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})$/);
    if (m1) {
        const [, Y, Mo, D, H, Mi] = m1;
        return new Date(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi), 0, 0).getTime();
    }

    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m2) {
        const [, Y, Mo, D, H, Mi] = m2;
        return new Date(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi), 0, 0).getTime();
    }

    return NaN;
}

function buildPoints(series, field) {
    const pts = series
        .map((row) => {
            const tsRaw = row?.timestamp;
            const x = parseTimestampToMs(tsRaw);
            const yRaw = row?.value ?? row?.[field];
            const y = Number(yRaw);

            if (!Number.isFinite(x)) return null;
            if (!Number.isFinite(y)) return null;
            return { x, y };
        })
        .filter(Boolean)
        .sort((a, b) => a.x - b.x);

    const dedup = [];
    for (const p of pts) {
        const last = dedup[dedup.length - 1];
        if (last && last.x === p.x) {
            last.y = p.y;
        } else {
            dedup.push(p);
        }
    }

    return dedup;
}

async function loadAndRender({ field, startMs, endExclusiveMs, chartType }) {
    setStatus('Load Data…');
    btn.disabled = true;

    try {
        const seriesUrl = buildUrl('/api/measurements', { field, startMs, endExclusiveMs });
        const series = await fetchJsonOrThrow(seriesUrl, 'Series');
        const points = buildPoints(series, field);

        countEl.textContent = `Points: ${points.length}`;

        if (points.length === 0) {
            destroyChart();
            clearUI();
            setStatus('There are no points for the selected period/field.', 'error');
            return;
        }

        const metricsUrl = buildUrl('/api/measurements/metrics', { field, startMs, endExclusiveMs });
        const metrics = await fetchJsonOrThrow(metricsUrl, 'Metrics');

        avgEl.textContent = fmtNumber(metrics?.avg);
        minEl.textContent = fmtNumber(metrics?.min);
        maxEl.textContent = fmtNumber(metrics?.max);
        stdDevEl.textContent = fmtNumber(metrics?.stdDev);

        renderChart({ chartType, field, points, startMs, endExclusiveMs });

        setStatus('Готово.');
    } catch (e) {
        destroyChart();
        clearUI();
        setStatus(e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function setDefaultDates() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const toDateInput = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    startEl.value = toDateInput(start);
    endEl.value = toDateInput(end);
}

btnReset.addEventListener('click', () => {
    fieldEl.value = 'temperature';
    chartTypeEl.value = 'line';
    setDefaultDates();
    setStatus('');
    destroyChart();
    clearUI();
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const field = fieldEl.value;
    const chartType = chartTypeEl.value;

    const startMs = dateInputToLocalStartMs(startEl.value);
    const endExclusiveMs = addDaysMs(dateInputToLocalStartMs(endEl.value), 1);

    loadAndRender({ field, startMs, endExclusiveMs, chartType });
});

setDefaultDates();
clearUI();
