// Etapa 3: métodos de validación y métricas de evaluación.
// (suma está definida en clasificador.js)
const barajar = a => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// X% para entrenamiento y el resto para pruebas. Si estratificar, el mismo porcentaje por clase.
function dividir(filas, pct, estratificar) {
  const porClase = {};
  filas.forEach(f => (porClase[f.at(-1)] ||= []).push(f));
  const grupos = estratificar ? Object.values(porClase) : [filas];
  const entrenamiento = [], prueba = [];
  for (const g of grupos) {
    const n = Math.round(g.length * pct / 100), m = barajar(g);
    entrenamiento.push(...m.slice(0, n));
    prueba.push(...m.slice(n));
  }
  return { entrenamiento, prueba };
}

function particiones(ds, p, externo) {
  if (p.metodo === 'externo') return [{ entrenamiento: ds.filas, prueba: externo.filas }];
  if (p.metodo === 'cruzada') {
    const { entrenamiento: a, prueba: b } = dividir(ds.filas, 50, false);
    return [{ entrenamiento: a, prueba: b }, { entrenamiento: b, prueba: a }];
  }
  return [dividir(ds.filas, p.pct, p.metodo === 'estratificada')];
}

// Matriz de confusión (filas: predicha, columnas: real), precisión, recall, f1 y accuracy.
function metricas(preds, clases) {
  const matriz = clases.map(p => clases.map(r => preds.filter(q => q.clase === p && q.real === r).length));
  const porClase = clases.map((clase, i) => {
    const tp = matriz[i][i], predichos = suma(matriz[i]), soporte = suma(matriz.map(f => f[i]));
    const precision = predichos ? tp / predichos : 0, recall = soporte ? tp / soporte : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    return { clase, precision, recall, f1, soporte };
  });
  const prom = k => suma(porClase.map(c => c[k] * c.soporte)) / preds.length;
  return {
    matriz, porClase,
    promedio: { precision: prom('precision'), recall: prom('recall'), f1: prom('f1'), soporte: preds.length },
    accuracy: suma(clases.map((_, i) => matriz[i][i])) / preds.length,
  };
}

function evaluar(ds, p, externo) {
  const na = ds.tipos.length, predicciones = [], tamanos = [];
  let clases;
  for (const { entrenamiento, prueba } of particiones(ds, p, externo)) {
    const modelo = new NaiveBayes(p).entrenar(entrenamiento, ds.tipos);
    clases = modelo.clases;
    tamanos.push([entrenamiento.length, prueba.length]);
    for (const f of prueba) {
      const { clase, probs } = modelo.predecir(f.slice(0, na));
      predicciones.push({ x: f.slice(0, na), real: f[na], clase, probs });
    }
  }
  const conClase = predicciones.every(q => q.real !== undefined);
  return { clases, tamanos, predicciones, metricas: conClase ? metricas(predicciones, ds.clases) : null };
}
