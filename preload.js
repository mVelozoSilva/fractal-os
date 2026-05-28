const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SESION_PATH = path.join(os.homedir(), '.fractal-sesion.json');

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
  unirRuta: (...partes) => path.join(...partes),
  guardarSesion: (datos) => {
    fs.writeFileSync(SESION_PATH, JSON.stringify(datos, null, 2), 'utf8');
    return true;
  },
  leerSesion: () => {
    try {
      if (!fs.existsSync(SESION_PATH)) return null;
      return JSON.parse(fs.readFileSync(SESION_PATH, 'utf8'));
    } catch {
      return null;
    }
  }
});

contextBridge.exposeInMainWorld('mammoth', require('mammoth'));

contextBridge.exposeInMainWorld('fractalAcciones', {
  agendarOutlook: (datos) => ipcRenderer.invoke('agendar-outlook', datos),
  editarExcel:    (datos) => ipcRenderer.invoke('editar-excel', datos),
  notificar:      (datos) => ipcRenderer.invoke('notificar', datos),
  notificarEnMinutos: (datos) => ipcRenderer.invoke('notificar-en-minutos', datos)
});