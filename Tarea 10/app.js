// Interfaz: conecta la pantalla con la validación, la clasificación y las métricas.
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const f2 = v => v.toFixed(2);
const metodo = () => document.querySelector('input[name=metodo]:checked').value;
const leer = id => $(id).files[0]?.text();

const tabla = (cab, filas) =>
  `<table><tr>${cab.map(c => `<th>${esc(c)}</th>`).join('')}</tr>` +
  filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') + '</table>';

// Filas: clase predicha. Columnas: clase real.
function tablaMatriz(matriz, clases) {
  const totales = clases.map((_, j) => suma(matriz.map(f => f[j])));
  const max = Math.max(...matriz.flat(), 1);
  const celda = (v, i, j) => `<td class="${i === j ? 'ok' : 'err'}" style="--v:${v / max}">${v}</td>`;
  const filas = matriz.map((f, i) =>
    `<tr><th>${esc(clases[i])}</th>${f.map((v, j) => celda(v, i, j)).join('')}<td>${suma(f)}</td></tr>`);
  return `<table><tr><th>Predicha \\ Real</th>${clases.map(c => `<th>${esc(c)}</th>`).join('')}<th>Total</th></tr>` +
    filas.join('') + `<tr><th>Total</th>${totales.map(v => `<td>${v}</td>`).join('')}<td>${suma(totales)}</td></tr></table>`;
}

function mostrarErrores(errores) {
  const lista = errores.slice(0, 8).map(e => `<div>• ${esc(e)}</div>`);
  if (errores.length > 8) lista.push(`<div>… y ${errores.length - 8} errores más.</div>`);
  $('errores').innerHTML = lista.join('');
  if (errores.length) $('resultados').hidden = true;
}

function mostrarResultados(r, ds, m) {
  $('resultados').hidden = false;
  $('info').textContent = 'Entrenamiento / prueba: ' + r.tamanos.map(([a, b]) => `${a} / ${b}`).join(' y ');
  $('evaluacion').hidden = !r.metricas;
  if (r.metricas) {
    const { matriz, porClase, promedio, accuracy } = r.metricas;
    $('matriz').innerHTML = tablaMatriz(matriz, ds.clases);
    $('metricas').innerHTML = tabla(['Categoría', 'Precisión', 'Exhaustividad', 'Medida F', 'Soporte'], [
      ...porClase.map(c => [c.clase, f2(c.precision), f2(c.recall), f2(c.f1), c.soporte]),
      ['Prom./total', f2(promedio.precision), f2(promedio.recall), f2(promedio.f1), promedio.soporte],
    ]);
    $('accuracy').textContent = f2(accuracy);
  }
  // Con archivo externo se muestra la clasificación de cada instancia.
  $('predicciones').innerHTML = m !== 'externo' ? '' : '<h2>Clasificación de las instancias</h2><div class="tabla">' +
    tabla([...ds.cabecera.slice(0, -1), 'Clase predicha', ...r.clases.map(c => `% ${c}`)],
      r.predicciones.map(q => [...q.x, q.clase, ...q.probs.map(p => (p * 100).toFixed(1) + '%')])) + '</div>';
}

// Habilita solo los controles que aplican al método elegido.
function actualizarControles() {
  $('pct').disabled = !['simple', 'estratificada'].includes(metodo());
  $('externo').disabled = metodo() !== 'externo';
  $('intervalos').disabled = $('continuo').value === 'densidad';
}
document.querySelectorAll('input[name=metodo], #continuo').forEach(e => e.onchange = actualizarControles);
actualizarControles();

$('analizar').onclick = async () => {
  const p = { metodo: metodo(), pct: Number($('pct').value), continuo: $('continuo').value, intervalos: Number($('intervalos').value) };
  const textoDataset = await leer('dataset');
  if (!textoDataset) return mostrarErrores(['Cargue un dataset (archivo CSV).']);

  const ds = validarDataset(textoDataset);
  let errores = ds.errores, externo;
  if (!errores.length) {
    errores = validarParametros(p, ds);
    if (p.metodo === 'externo') {
      const textoExterno = await leer('externo');
      if (!textoExterno) errores.push('Seleccione el archivo de pruebas externo.');
      else errores.push(...(externo = validarExterno(textoExterno, ds)).errores);
    }
  }
  mostrarErrores(errores);
  if (!errores.length) mostrarResultados(evaluar(ds, p, externo), ds, p.metodo);
};
