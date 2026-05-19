// Mock data for a Bolt courier — Lisbon-based, currency EUR
const DATA = {
  today: {
    labels: ['08','09','10','11','12','13','14','15','16','17','18','19','20'],
    fares: [0, 7.2, 12.8, 14.5, 22.1, 18.4, 9.6, 8.2, 11.0, 16.8, 24.3, 19.5, 6.4],
    tips:  [0, 0.5, 1.2, 0.0, 2.4, 1.0, 0.6, 0.0, 0.8, 1.5, 3.1, 1.8, 0.4],
    hoursOnline: 9.5,
    distance: 78,
    trips: 21,
    prev: { net: 142.10 },
    subtitle: 'Earnings by hour today',
  },
  week: {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    fares: [98.40, 112.20, 87.50, 124.80, 168.30, 192.60, 145.20],
    tips:  [6.20, 8.40, 4.10, 9.80, 14.50, 22.30, 12.40],
    hoursOnline: 42,
    distance: 524,
    trips: 138,
    prev: { net: 812.50 },
    subtitle: 'Earnings by day this week',
  },
  month: {
    labels: ['Week 1','Week 2','Week 3','Week 4'],
    fares: [742.10, 815.30, 689.40, 928.50],
    tips:  [58.40, 71.20, 49.80, 82.60],
    hoursOnline: 168,
    distance: 2180,
    trips: 542,
    prev: { net: 3105.40 },
    subtitle: 'Earnings by week this month',
  },
  year: {
    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fares: [2810, 2640, 2980, 3120, 3340, 3580, 3820, 3650, 3210, 2950, 0, 0],
    tips:  [180, 165, 210, 245, 280, 310, 340, 320, 260, 230, 0, 0],
    hoursOnline: 1640,
    distance: 21850,
    trips: 5480,
    prev: { net: 28940 },
    subtitle: 'Earnings by month this year',
  },
};

const TRANSACTIONS = [
  { type: 'Food', icon: '🍔', time: '19:42', from: 'Time Out Market', to: 'Bairro Alto', distance: 2.1, fare: 6.40, tip: 1.50 },
  { type: 'Food', icon: '🍕', time: '19:08', from: 'Pizzaria Lisboa', to: 'Príncipe Real', distance: 1.4, fare: 5.20, tip: 0 },
  { type: 'Ride', icon: '🚗', time: '18:31', from: 'Cais do Sodré', to: 'Aeroporto Humberto Delgado', distance: 8.7, fare: 14.80, tip: 3.00 },
  { type: 'Food', icon: '🥡', time: '17:55', from: 'Wok to Walk', to: 'Avenida da Liberdade', distance: 1.8, fare: 5.80, tip: 0.50 },
  { type: 'Food', icon: '🍣', time: '17:12', from: 'Sushi Café', to: 'Chiado', distance: 0.9, fare: 4.60, tip: 1.20 },
  { type: 'Ride', icon: '🚗', time: '16:24', from: 'Marquês de Pombal', to: 'Belém', distance: 6.2, fare: 11.40, tip: 0 },
  { type: 'Food', icon: '🍔', time: '15:48', from: "h3 Hamburgology", to: 'Estrela', distance: 2.3, fare: 6.10, tip: 1.00 },
  { type: 'Food', icon: '🌮', time: '14:35', from: 'Pistola y Corazón', to: 'Santos', distance: 1.6, fare: 5.50, tip: 0.80 },
  { type: 'Ride', icon: '🚗', time: '13:18', from: 'Parque das Nações', to: 'Saldanha', distance: 4.4, fare: 9.20, tip: 1.50 },
  { type: 'Food', icon: '🥗', time: '12:42', from: 'Honest Greens', to: 'Avenidas Novas', distance: 1.2, fare: 4.90, tip: 0 },
];

const fmtEuro = (n) => '€' + n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtEuroShort = (n) => '€' + Math.round(n).toLocaleString('en-IE');

let chart;
let currentPeriod = 'week';
let currentOffset = 0; // 0 = current, -1 = previous, -2 = two ago, etc.

const COMMISSION_RATE = 0.20; // Bolt takes ~20%, so gross = net / (1 - rate)

const PERIOD_NOUN = { today: 'day', week: 'week', month: 'month', year: 'year' };
const PERIOD_BUCKET = { today: 'hour', week: 'day', month: 'week', year: 'month' };

function offsetLabel(period, offset) {
  if (offset === 0) {
    return period === 'today' ? 'Today' : 'This ' + PERIOD_NOUN[period];
  }
  if (offset === -1) {
    return period === 'today' ? 'Yesterday' : 'Last ' + PERIOD_NOUN[period];
  }
  const n = Math.abs(offset);
  const noun = period === 'today' ? 'day' : PERIOD_NOUN[period];
  return `${n} ${noun}s ago`;
}

// Deterministic variation so previous periods look real, not random each click.
function getPeriodData(period, offset) {
  const base = DATA[period];
  if (offset === 0) return base;

  const seedBase = period.charCodeAt(0) + Math.abs(offset) * 137;
  const variation = (i) => {
    const s = seedBase + i * 31;
    // returns ~0.65 to ~1.20
    return 0.65 + 0.55 * (Math.sin(s) * 0.5 + 0.5);
  };
  const scale = (v, i) => v === 0 ? 0 : Math.round(v * variation(i) * 100) / 100;

  // For 'year' offset, fill in the zero months (we treat them as historic complete years).
  const isHistoricYear = period === 'year' && offset < 0;
  const fillIfZero = (arr, i) => {
    if (!isHistoricYear || arr[i] !== 0) return arr[i];
    // estimate from non-zero entries
    const nonZero = arr.filter(x => x > 0);
    const avg = nonZero.reduce((a,b)=>a+b,0) / Math.max(nonZero.length, 1);
    return avg;
  };

  const fares = base.fares.map((v, i) => scale(fillIfZero(base.fares, i), i));
  const tips  = base.tips.map((v, i) => scale(fillIfZero(base.tips, i), i));

  const macro = 0.80 + 0.30 * (Math.sin(seedBase * 0.5) * 0.5 + 0.5);

  return {
    ...base,
    fares,
    tips,
    hoursOnline: Math.round(base.hoursOnline * macro * 10) / 10,
    distance: Math.round(base.distance * macro),
    trips: Math.round(base.trips * macro),
  };
}

function render(period, offset = 0) {
  const d = getPeriodData(period, offset);
  const totalFares = d.fares.reduce((a,b) => a+b, 0);
  const totalTips = d.tips.reduce((a,b) => a+b, 0);
  const net = totalFares + totalTips;
  const gross = net / (1 - COMMISSION_RATE);
  const avgHour = d.hoursOnline > 0 ? net / d.hoursOnline : 0;

  // Compare to the period one step earlier
  const prevD = getPeriodData(period, offset - 1);
  const prevNet = prevD.fares.reduce((a,b)=>a+b,0) + prevD.tips.reduce((a,b)=>a+b,0);

  // Stat cards
  document.getElementById('net-income').textContent = fmtEuro(net);
  document.getElementById('gross-income').textContent = 'Gross ' + fmtEuro(gross);
  document.getElementById('avg-hour').textContent = fmtEuro(avgHour);
  document.getElementById('hours-online').textContent = d.hoursOnline.toLocaleString('en-IE') + 'h online';
  document.getElementById('trip-count').textContent = d.trips.toLocaleString('en-IE');
  document.getElementById('tip-total').textContent = fmtEuro(totalTips) + ' in tips';
  document.getElementById('distance').textContent = d.distance.toLocaleString('en-IE') + ' km';

  // Trend
  const delta = prevNet > 0 ? ((net - prevNet) / prevNet) * 100 : 0;
  const trendEl = document.getElementById('net-trend');
  trendEl.textContent = (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta).toFixed(1) + '%';
  trendEl.className = 'trend ' + (delta >= 0 ? 'up' : 'down');

  // Chart subtitle: "Net earnings by <bucket> · <when>"
  const bucket = PERIOD_BUCKET[period];
  document.getElementById('chart-subtitle').textContent =
    `Net earnings by ${bucket} · ${offsetLabel(period, offset)}`;

  // Right arrow disabled when viewing current period
  document.getElementById('next-period').disabled = offset >= 0;

  // Chart
  renderChart(d);
}

function renderChart(d) {
  const ctx = document.getElementById('earnings-chart').getContext('2d');
  const data = {
    labels: d.labels,
    datasets: [
      {
        label: 'Fares',
        data: d.fares,
        backgroundColor: '#34d186',
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: 'earn',
        maxBarThickness: 48,
      },
      {
        label: 'Tips',
        data: d.tips,
        backgroundColor: 'rgba(110, 231, 183, 0.55)',
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: 'earn',
        maxBarThickness: 48,
      },
    ],
  };

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0b0d0c',
        borderColor: '#232a2d',
        borderWidth: 1,
        padding: 12,
        titleColor: '#f3f6f5',
        bodyColor: '#f3f6f5',
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        callbacks: {
          label: (ctx) => ctx.dataset.label + ': ' + fmtEuro(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { color: '#232a2d' },
        ticks: { color: '#8a9498', font: { family: 'Inter', size: 12 } },
      },
      y: {
        stacked: true,
        grid: { color: '#1f2528', drawBorder: false },
        border: { display: false },
        ticks: {
          color: '#8a9498',
          font: { family: 'Inter', size: 12 },
          callback: (v) => fmtEuroShort(v),
        },
      },
    },
  };

  if (chart) {
    chart.data = data;
    chart.options = opts;
    chart.update();
  } else {
    chart = new Chart(ctx, { type: 'bar', data, options: opts });
  }
}

function renderTransactions() {
  const list = document.getElementById('tx-list');
  list.innerHTML = TRANSACTIONS.map(t => {
    const total = t.fare + t.tip;
    const iconClass = t.type === 'Food' ? 'food' : 'ride';
    const tipLine = t.tip > 0
      ? `<div class="tx-tip">incl. ${fmtEuro(t.tip)} tip</div>`
      : '';
    return `
      <div class="tx-row">
        <div class="tx-icon ${iconClass}">${t.icon}</div>
        <div class="tx-main">
          <div class="tx-type">${t.type} delivery</div>
          <div class="tx-time">Today · ${t.time}</div>
        </div>
        <div class="tx-route">
          <span>${t.from}</span>
          <span class="arrow">→</span>
          <span>${t.to}</span>
        </div>
        <div class="tx-distance">${t.distance.toFixed(1)} km</div>
        <div>
          <div class="tx-amount">${fmtEuro(total)}</div>
          ${tipLine}
        </div>
      </div>
    `;
  }).join('');
}

// Wire up period toggle
document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    currentOffset = 0;
    render(currentPeriod, currentOffset);
  });
});

// Wire up chart navigation arrows
document.getElementById('prev-period').addEventListener('click', () => {
  currentOffset -= 1;
  render(currentPeriod, currentOffset);
});
document.getElementById('next-period').addEventListener('click', () => {
  if (currentOffset < 0) {
    currentOffset += 1;
    render(currentPeriod, currentOffset);
  }
});

// Initial render
render(currentPeriod, currentOffset);
renderTransactions();
