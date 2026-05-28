import * as XLSX from 'xlsx';

export async function leerExcel(rutaArchivo) {
  const buffer = await window.fractalFS.leerArchivoBuffer(rutaArchivo);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let resultado = '';
  workbook.SheetNames.forEach(nombre => {
    const hoja = workbook.Sheets[nombre];
    const texto = XLSX.utils.sheet_to_csv(hoja);
    resultado += `Hoja: ${nombre}\n${texto}\n\n`;
  });
  return resultado;
}

export async function leerWord(rutaArchivo) {
  const buffer = await window.fractalFS.leerArchivoBuffer(rutaArchivo);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  const resultado = await window.mammoth.extractRawText({ arrayBuffer });
  return resultado.value;
}

export async function escanearCarpeta(ruta) {
  const archivos = await window.fractalFS.leerCarpeta(ruta);
  return archivos.filter(a =>
    a.endsWith('.xlsx') || a.endsWith('.xls') ||
    a.endsWith('.docx') || a.endsWith('.txt')
  );
}