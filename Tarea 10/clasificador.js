// Etapa 2: clasificador Bayes ingenuo (variables discretas y continuas).
const suma = a => a.reduce((s, v) => s + v, 0);

function estadisticos(v) {
  const media = suma(v) / v.length;
  const varianza = v.length > 1 ? suma(v.map(x => (x - media) ** 2)) / (v.length - 1) : 0;
  return { media, desv: Math.max(Math.sqrt(varianza), 1e-3) };
}

function contar(v) {
  const c = {};
  v.forEach(x => c[x] = (c[x] || 0) + 1);
  return c;
}

// Puntos de corte para discretizar: anchos iguales o frecuencias iguales.
function calcularCortes(v, metodo, n) {
  if (metodo === 'anchos') {
    const min = Math.min(...v), paso = (Math.max(...v) - min) / n;
    return paso ? Array.from({ length: n - 1 }, (_, i) => min + paso * (i + 1)) : [];
  }
  const o = [...v].sort((a, b) => a - b);
  return [...new Set(Array.from({ length: n - 1 }, (_, i) => o[Math.floor((i + 1) * o.length / n)]))];
}

class NaiveBayes {
  // continuo: 'densidad' | 'anchos' | 'frecuencias'. k: suavizado de Laplace.
  constructor({ continuo = 'densidad', intervalos = 5 } = {}, k = 1) {
    Object.assign(this, { continuo, intervalos, k });
  }

  usaDensidad(j) { return this.tipos[j] === 'num' && !this.cortes[j]; }

  // Valor discreto de un atributo: intervalo (si se discretizó) o el valor mismo.
  discreto(x, j) { return this.cortes[j] ? this.cortes[j].filter(c => x >= c).length : x; }

  // filas: atributos + clase (última columna).
  entrenar(filas, tipos) {
    this.tipos = tipos;
    this.clases = [...new Set(filas.map(f => f.at(-1)))].sort();
    this.cortes = tipos.map((t, j) => t === 'num' && this.continuo !== 'densidad'
      ? calcularCortes(filas.map(f => f[j]), this.continuo, this.intervalos) : null);
    this.posibles = tipos.map((_, j) => this.cortes[j] ? this.cortes[j].length + 1 : new Set(filas.map(f => f[j])).size);
    this.modelo = this.clases.map(c => {
      const fc = filas.filter(f => f.at(-1) === c);
      return {
        n: fc.length,
        prior: fc.length / filas.length,
        attrs: tipos.map((_, j) => this.usaDensidad(j) ? estadisticos(fc.map(f => f[j])) : contar(fc.map(f => this.discreto(f[j], j)))),
      };
    });
    return this;
  }

  // log P(atributo j = x | clase): densidad normal o frecuencias con Laplace.
  logProb(m, j, x) {
    if (this.usaDensidad(j)) {
      const { media, desv } = m.attrs[j];
      return -Math.log(desv * Math.sqrt(2 * Math.PI)) - (x - media) ** 2 / (2 * desv ** 2);
    }
    const cuenta = m.attrs[j][this.discreto(x, j)] || 0;
    return Math.log((cuenta + this.k) / (m.n + this.k * this.posibles[j]));
  }

  // x: solo atributos. Devuelve la clase y el porcentaje de cada clase.
  predecir(x) {
    const logs = this.modelo.map(m => Math.log(m.prior) + suma(x.map((v, j) => this.logProb(m, j, v))));
    const max = Math.max(...logs), exp = logs.map(l => Math.exp(l - max));
    const probs = exp.map(e => e / suma(exp));
    return { clase: this.clases[probs.indexOf(Math.max(...probs))], probs };
  }
}
