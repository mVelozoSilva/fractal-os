const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('fractalFS', {
  leerCarpeta: (rutaCarpeta) => {
    const archivos = fs.readdirSync(rutaCarpeta);
    return archivos;
  },
  leerArchivo: (rutaArchivo) => {
    return fs.readFileSync(rutaArchivo, 'utf8');
  },
  rutaHome: () => require('os').homedir()
});