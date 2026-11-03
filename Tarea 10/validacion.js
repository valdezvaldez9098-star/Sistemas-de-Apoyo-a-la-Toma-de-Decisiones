// Etapa 1: validación del dataset y de los parámetros de entrada.
const esNumero = v => v !== '' && !isNaN(Number(v));

// Lee un CSV (separador , ; o tabulador) y revisa que todas las filas estén completas.
function leerTabla(texto) {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim());
  if (lineas.length < 2) return { errores: ['El archivo debe tener encabezado y al menos una instancia.'] };
  const sep = [',', ';', '\t'].find(s => lineas[0].includes(s)) || ',';
  const [cabecera, ...filas] = lineas.map(l => l.split(sep).map(c => c.trim()));
  const errores = [];
  filas.forEach((f, i) => {
    if (f.length !== cabecera.length) errores.push(`Fila ${i + 2}: tiene ${f.length} columnas y se esperaban ${cabecera.length}.`);
    else if (f.includes('')) errores.push(`Fila ${i + 2}: contiene valores vacíos.`);
  });
  return { cabecera, filas, errores };
}

// Dataset: x atributos y la clase en la última columna. Detecta atributos continuos (num) y discretos (cat).
function validarDataset(texto) {
  const t = leerTabla(texto);
  if (t.errores.length) return t;
  const { cabecera, filas } = t, errores = [];
  if (cabecera.length < 2) errores.push('Se requiere al menos un atributo y la columna de clase (última columna).');
  const tipos = cabecera.slice(0, -1).map((nombre, j) => {
    const nums = filas.filter(f => esNumero(f[j])).length;
    if (nums > 0 && nums < filas.length) errores.push(`Columna "${nombre}": mezcla números y texto.`);
    return nums === filas.length ? 'num' : 'cat';
  });
  const clases = [...new Set(filas.map(f => f.at(-1)))].sort();
  if (clases.length < 2) errores.push('La clase debe tener al menos 2 categorías.');
  const datos = filas.map(f => f.map((c, j) => tipos[j] === 'num' ? Number(c) : c));
  return { cabecera, filas: datos, tipos, clases, errores };
}

// Archivo de pruebas externo: mismos atributos que el dataset; la columna de clase es opcional.
function validarExterno(texto, ds) {
  const t = leerTabla(texto);
  if (t.errores.length) return t;
  const na = ds.tipos.length, errores = [];
  if (t.cabecera.length !== na && t.cabecera.length !== na + 1)
    return { errores: [`El archivo de pruebas debe tener ${na} columnas (atributos) o ${na + 1} (con clase).`] };
  t.filas.forEach((f, i) => {
    ds.tipos.forEach((tipo, j) => { if (tipo === 'num' && !esNumero(f[j])) errores.push(`Fila ${i + 2}: "${ds.cabecera[j]}" debe ser numérico.`); });
    if (f.length > na && !ds.clases.includes(f[na])) errores.push(`Fila ${i + 2}: la clase "${f[na]}" no existe en el dataset.`);
  });
  const filas = t.filas.map(f => f.map((c, j) => ds.tipos[j] === 'num' ? Number(c) : c));
  return { filas, errores };
}

// Parámetros de configuración.
function validarParametros(p, ds) {
  const errores = [], n = ds.filas.length, train = Math.round(n * p.pct / 100);
  if (['simple', 'estratificada'].includes(p.metodo) && (!(p.pct > 0 && p.pct < 100) || train < 1 || train >= n))
    errores.push('El porcentaje de entrenamiento debe estar entre 1 y 99 y dejar instancias para entrenamiento y prueba.');
  if (p.continuo !== 'densidad' && !(Number.isInteger(p.intervalos) && p.intervalos >= 2))
    errores.push('El intervalo de discretización debe ser un entero mayor o igual a 2.');
  return errores;
}
