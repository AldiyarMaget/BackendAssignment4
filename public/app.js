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
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
}

function clearUI() {
    avgEl.textContent = '—';
    minEl.textContent = '—';
    maxEl.textContent = '—';
    stdDevEl.textContent = '—';
    countEl.textContent = 'Точек: —';
}

function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

function renderChart({ chartType, field, points }) {
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
                pointRadius: isLine ? 2 : 0,
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

function buildPoints(series, field) {
    const pts = series
        .map((row) => {
            const tsRaw = row?.timestamp;
            const x = Date.parse(tsRaw);
            const yRaw = row?.value ?? row?.[field];
            const y = Number(yRaw);

            if (!Number.isFinite(x)) return null;
            if (!Number.isFinite(y)) return null;
            return { x, y };
        })
        .filter(Boolean)
        .sort((a, b) => a.x - b.x);

    return pts;
}

async function loadAndRender({ field, start_date, end_date, chartType }) {
    setStatus('Загрузка данных…');
    btn.disabled = true;

    try {
        const seriesUrl = buildUrl('/api/measurements', { field, start_date, end_date });
        const series = await fetchJsonOrThrow(seriesUrl, 'Series');
        const points = buildPoints(series, field);

        countEl.textContent = `Точек: ${points.length}`;

        if (points.length === 0) {
            destroyChart();
            clearUI();
            setStatus('Нет точек для выбранного периода/поля.', 'error');
            return;
        }


        const metricsUrl = buildUrl('/api/measurements/metrics', { field, start_date, end_date });
        const metrics = await fetchJsonOrThrow(metricsUrl, 'Metrics');

        avgEl.textContent = fmtNumber(metrics?.avg);
        minEl.textContent = fmtNumber(metrics?.min);
        maxEl.textContent = fmtNumber(metrics?.max);
        stdDevEl.textContent = fmtNumber(metrics?.stdDev);

        renderChart({ chartType, field, points });

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
    const start_date = startEl.value;
    const end_date = endEl.value;
    const chartType = chartTypeEl.value;

    loadAndRender({ field, start_date, end_date, chartType });
});

setDefaultDates();
clearUI();
