const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

contextBridge.exposeInMainWorld('fractalFS', {
  leerCarpeta: (rutaCarpeta) => {
    try {
      return fs.readdirSync(rutaCarpeta);
    } catch (e) {
      return [];
    }
  },
  leerArchivoBuffer: (rutaArchivo) => {
    return fs.readFileSync(rutaArchivo);
  },
  leerArchivoTexto: (rutaArchivo) => {
    return fs.readFileSync(rutaArchivo, 'utf8');
  },
  escribirArchivo: (rutaArchivo, contenido) => {
    fs.writeFileSync(rutaArchivo, contenido, 'utf8');
    return true;
  },
  rutaHome: () => os.homedir(),
  unirRuta: (...partes) => path.join(...partes)
});

contextBridge.exposeInMainWorld('mammoth', require('mammoth'));