const { app, BrowserWindow, session, ipcMain, Notification } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform === 'win32') {
  app.setAppUserModelId('FractalOS');
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded]);
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', d => stdout += d.toString());
    ps.stderr.on('data', d => stderr += d.toString());
    ps.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `PowerShell salió con código ${code}`));
    });
  });
}

ipcMain.handle('agendar-outlook', async (event, { titulo, fechaISO, duracion = 60, persona = '' }) => {
  const [datePart, timePart] = fechaISO.split(' ');
  const [year, month, day] = datePart.split('-');
  const fechaPS = `${month}/${day}/${year} ${timePart}`;
  const tituloSafe = titulo.replace(/"/g, '""');
  const personaSafe = persona.replace(/"/g, '""');

  const script = `
$ErrorActionPreference = "Stop"
$app = New-Object -ComObject "Outlook.Application"
$item = $app.CreateItem(1)
$item.Subject = "${tituloSafe}"
$item.Start = [DateTime]::Parse("${fechaPS}")
$item.Duration = ${duracion}
${persona ? `$item.Body = "Con: ${personaSafe}"` : ''}
$item.Save()
Write-Output "OK"
`.trim();

  return runPowerShell(script);
});

ipcMain.handle('editar-excel', async (event, { buscarValor, columna, nuevoValor }) => {
  const XLSX = require('xlsx');
  const docsPath = app.getPath('documents');

  const archivos = fs.readdirSync(docsPath)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

  if (archivos.length === 0) throw new Error('No hay archivos Excel en Documentos');

  for (const archivo of archivos) {
    const rutaCompleta = path.join(docsPath, archivo);
    try {
      const wb = XLSX.readFile(rutaCompleta);

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (data.length < 2) continue;

        const headers = data[0].map(h => String(h).toLowerCase().trim());
        const colIdx = headers.findIndex(h => h === columna.toLowerCase().trim());
        if (colIdx === -1) continue;

        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
          const match = data[rowIdx].some(cell =>
            String(cell).toLowerCase().includes(buscarValor.toLowerCase())
          );
          if (match) {
            const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            ws[cellRef] = { v: nuevoValor, t: 's' };
            XLSX.writeFile(wb, rutaCompleta);
            return { archivo, fila: rowIdx + 1, columna, nuevoValor };
          }
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error(`No encontré "${buscarValor}" en ningún archivo Excel`);
});

ipcMain.handle('notificar', async (event, { titulo, cuerpo }) => {
  new Notification({ title: titulo, body: cuerpo }).show();
  return true;
});

ipcMain.handle('notificar-en-minutos', async (event, { titulo, cuerpo, minutos }) => {
  setTimeout(() => new Notification({ title: titulo, body: cuerpo }).show(), minutos * 60 * 1000);
  return true;
});

function createWindow() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler(() => true);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#F5F2EA',
    title: 'Fractal OS'
  });

  const startUrl = process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, 'build/index.html')}`;

  win.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
