// Datos por defecto: ejercicio de la práctica 7 (horas de estudio x, calificación y)
const datos = [[2, 55], [4, 62], [5, 70], [6, 68], [8, 78], [9, 84], [11, 80], [12, 92], [14, 90], [15, 96]];
const GL = 1; // 1 = varianza muestral (n − 1), 0 = poblacional (n)

const $ = id => document.getElementById(id);
const sum = a => a.reduce((s, v) => s + v, 0);
const mean = a => sum(a) / a.length;
const fmt = (v, d = 4) => Number.isFinite(v) ? v.toFixed(d) : '–';   // texto con decimales fijos
const r = (v, d = 4) => Number.isFinite(v) ? +v.toFixed(d) : '–';    // número sin ceros sobrantes

// ---------- Gráficas ----------
const grafica = new Chart($('grafica'), {
  type: 'scatter',
  data: { datasets: [
    { label: 'Datos', data: [], backgroundColor: '#1f6f8b' },
    { label: 'Recta de tendencia', data: [], showLine: true, pointRadius: 0, borderColor: '#e4572e' },
    { label: 'Predicción', data: [], backgroundColor: '#f2a900', borderColor: '#1b2430', borderWidth: 2, pointStyle: 'rectRot', pointRadius: 9 }
  ] },
  options: { scales: { x: { title: { display: true, text: 'x' } }, y: { title: { display: true, text: 'y' } } } }
});
const barras = (id, color) => new Chart($(id), {
  type: 'bar',
  data: { labels: [], datasets: [{ data: [], backgroundColor: color }] },
  options: { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'Observación' } } } }
});
const gX = barras('graficaX', '#1f6f8b'), gY = barras('graficaY', '#e4572e');

// ---------- Cálculo ----------
function calcular() {
  const pts = datos.filter(([x, y]) => x !== '' && y !== '').map(([x, y]) => [+x, +y]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), n = pts.length;
  const sx = sum(xs), sy = sum(ys), sxy = sum(pts.map(([x, y]) => x * y)), sxx = sum(xs.map(x => x * x));
  const num = n * sxy - sx * sy, den = n * sxx - sx * sx;
  const m = num / den, b = (sy - m * sx) / n;                          // Mínimos Cuadrados
  const pred = xs.map(x => m * x + b), e = ys.map((y, i) => y - pred[i]);
  const abs = e.map(Math.abs), sq = e.map(v => v * v), pct = e.map((v, i) => abs[i] / ys[i]);
  const rmse = Math.sqrt(mean(sq)), mae = mean(abs), mape = 100 * mean(pct);
  const d = { pts, xs, ys, n, sx, sy, sxy, sxx, num, den, m, b, pred, e, abs, sq, pct, rmse, mae, mape };
  panel(d); actualizarGraficas(d); procedimiento(d);
}

// ---------- Dashboard ----------
function panel(d) {
  const ok = Number.isFinite(d.m);
  $('modelo').textContent = ok ? `y = ${fmt(d.m)}x ${d.b < 0 ? '−' : '+'} ${fmt(Math.abs(d.b))}` : '–';
  $('rmse').textContent = fmt(d.rmse);
  $('mae').textContent = fmt(d.mae);
  $('mape').textContent = Number.isFinite(d.mape) ? fmt(d.mape, 2) + '%' : '–';
  const xp = parseFloat($('xPred').value);
  $('yPred').textContent = ok && Number.isFinite(xp) ? `y = ${fmt(d.m * xp + d.b, 2)}` : 'y = –';
  [['X', d.xs], ['Y', d.ys]].forEach(([k, a]) => {
    const v = sum(a.map(t => (t - mean(a)) ** 2)) / (a.length - GL);
    $('media' + k).textContent = fmt(mean(a));
    $('desv' + k).textContent = fmt(Math.sqrt(v));
    $('var' + k).textContent = fmt(v);
  });
}

function actualizarGraficas(d) {
  const ok = Number.isFinite(d.m), xp = parseFloat($('xPred').value), hayXp = ok && Number.isFinite(xp);
  const ext = hayXp ? [...d.xs, xp] : d.xs, x0 = Math.min(...ext), x1 = Math.max(...ext);
  const [puntos, recta, prediccion] = grafica.data.datasets;
  puntos.data = d.pts.map(([x, y]) => ({ x, y }));
  recta.data = ok ? [{ x: x0, y: d.m * x0 + d.b }, { x: x1, y: d.m * x1 + d.b }] : [];
  prediccion.data = hayXp ? [{ x: xp, y: d.m * xp + d.b }] : [];
  grafica.update();
  [[gX, d.xs], [gY, d.ys]].forEach(([g, a]) => {
    g.data.labels = a.map((_, i) => i + 1);
    g.data.datasets[0].data = a;
    g.update();
  });
}

// ---------- Procedimiento ----------
const tabla = (cab, filas, pie) => `<table><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  <tfoot><tr>${pie.map(c => `<td>${c}</td>`).join('')}</tr></tfoot></table>`;

const estadisticas = (v, a) => {
  const mu = mean(a), ss = sum(a.map(q => (q - mu) ** 2)), k = a.length - GL;
  return `<code>${v}: media = ${r(sum(a))} / ${a.length} = ${r(mu)}</code>
    <code>${v}: varianza = Σ(${v} − media)² / ${GL ? '(n − 1)' : 'n'} = ${r(ss)} / ${k} = ${r(ss / k)}</code>
    <code>${v}: desviación estándar = √${r(ss / k)} = ${r(Math.sqrt(ss / k))}</code>`;
};

function procedimiento(d) {
  const { n, sx, sy, sxy, sxx, num, den, m, b } = d;
  $('pasos').innerHTML = `
    <h2>Procedimiento de los cálculos</h2>
    <h3>1. Sumatorias (n = ${n})</h3>
    ${tabla(['i', 'x', 'y', 'x·y', 'x²'], d.pts.map(([x, y], i) => [i + 1, x, y, r(x * y), r(x * x)]),
      ['Σ', r(sx), r(sy), r(sxy), r(sxx)])}
    <h3>2. Pendiente (m)</h3>
    <code>m = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)</code>
    <code>m = (${n}·${r(sxy)} − ${r(sx)}·${r(sy)}) / (${n}·${r(sxx)} − ${r(sx)}²) = ${r(num)} / ${r(den)} = ${r(m)}</code>
    <h3>3. Intercepto (b)</h3>
    <code>b = (Σy − m·Σx) / n</code>
    <code>b = (${r(sy)} − ${r(m, 6)}·${r(sx)}) / ${n} = ${r(b)}</code>
    <h3>4. Ecuación de la recta</h3>
    <code>ŷ = ${r(m)}x ${b < 0 ? '−' : '+'} ${r(Math.abs(b))}</code>
    <h3>5. Error de cada observación</h3>
    ${tabla(['i', 'x', 'y', 'ŷ', 'e = y − ŷ', '|e|', 'e²', '|e/y|'],
      d.pts.map(([x, y], i) => [i + 1, x, y, r(d.pred[i], 2), r(d.e[i], 2), r(d.abs[i], 2), r(d.sq[i], 2), r(100 * d.pct[i], 2) + '%']),
      ['Σ', '', '', '', '', r(sum(d.abs), 2), r(sum(d.sq), 2), r(100 * sum(d.pct), 2) + '%'])}
    <h3>6. Métricas</h3>
    <code>RMSE = √(Σe² / n) = √(${r(sum(d.sq))} / ${n}) = ${r(d.rmse)}</code>
    <code>MAE = Σ|e| / n = ${r(sum(d.abs))} / ${n} = ${r(d.mae)}</code>
    <code>MAPE = (100 / n)·Σ|e/y| = (100 / ${n})·${r(sum(d.pct))} = ${r(d.mape, 2)}%</code>
    <h3>7. Media, varianza y desviación estándar</h3>
    ${estadisticas('x', d.xs)}${estadisticas('y', d.ys)}`;
}

// ---------- Eventos ----------
function dibujarFilas() {
  $('filas').innerHTML = datos.map(([x, y], i) => `<tr>
    <td><input type="number" step="any" value="${x}" data-i="${i}" data-c="0" aria-label="x"></td>
    <td><input type="number" step="any" value="${y}" data-i="${i}" data-c="1" aria-label="y"></td>
    <td><button data-borrar="${i}" aria-label="Quitar fila">×</button></td></tr>`).join('');
}

$('filas').addEventListener('input', e => { datos[e.target.dataset.i][e.target.dataset.c] = e.target.value; calcular(); });
$('filas').addEventListener('click', e => {
  if (e.target.dataset.borrar) { datos.splice(e.target.dataset.borrar, 1); dibujarFilas(); calcular(); }
});
$('agregar').onclick = () => { datos.push(['', '']); dibujarFilas(); };
$('xPred').oninput = calcular;

document.querySelectorAll('nav button').forEach(boton => boton.onclick = () => {
  document.querySelectorAll('nav button').forEach(o => o.classList.toggle('active', o === boton));
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== boton.dataset.view);
});

dibujarFilas();
calcular();
