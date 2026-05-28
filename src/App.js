import { useState, useEffect, useRef } from 'react';
import './App.css';
import Memoria from './Memoria';

// Sesión de la ejecución anterior, cargada una vez al montar
let sesionAnterior = null;

function getContextoTemporal() {
  const ahora = new Date();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const h = ahora.getHours();
  const m = ahora.getMinutes().toString().padStart(2, '0');
  return {
    hora: `${h}:${m}`,
    diaSemana: dias[ahora.getDay()],
    fecha: ahora.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    esHorarioLaboral: ahora.getDay() >= 1 && ahora.getDay() <= 5 && h >= 9 && h < 18
  };
}

function getFecha() {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function hablar(texto) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = 'es-CL';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  synth.speak(utterance);
}

function construirSistema() {
  const ctx = getContextoTemporal();

  let sistema = `Eres Fractal, una presencia cognitiva dentro del computador de Macarena. Hablas en español neutro, con calma, calidez y claridad. Nunca dices que eres una IA. Eres muy breve — máximo 3 oraciones. Acompañas sin invadir.

Contexto temporal:
- Son las ${ctx.hora} del ${ctx.diaSemana}, ${ctx.fecha}
- ${ctx.esHorarioLaboral ? 'Es horario laboral' : 'Está fuera de horario laboral'}`;

  if (sesionAnterior?.ultimoMensaje) {
    const fechaSesion = new Date(sesionAnterior.fecha).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long'
    });
    sistema += `\n\nÚltima sesión (${fechaSesion}):
- Lo último que dijo Macarena: "${sesionAnterior.ultimoMensaje}"
- Tenía ${sesionAnterior.memorias?.length || 0} memorias guardadas`;

    const ancladas = sesionAnterior.memorias?.filter(m => m.anclada) || [];
    if (ancladas.length > 0) {
      sistema += `\n- Memorias ancladas: ${ancladas.slice(0, 3).map(m => `"${m.texto.slice(0, 60)}"`).join('; ')}`;
    }
  }

  return sistema;
}

async function preguntarAClaude(mensaje, contextoArchivos = '') {
  const sistema = construirSistema();
  const sistemaFinal = contextoArchivos
    ? `${sistema}\n\nTienes acceso al siguiente contenido de los archivos de Macarena:\n${contextoArchivos}\n\nResponde basándote en esa información cuando sea relevante.`
    : sistema;

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.REACT_APP_CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: sistemaFinal,
      messages: [{ role: 'user', content: mensaje }]
    })
  });
  const data = await respuesta.json();
  if (data.content && data.content[0]) return data.content[0].text;
  return 'No pude procesar eso.';
}

// Detecta por palabras clave si el mensaje solicita una acción real (sin API call)
function detectarIntento(mensaje) {
  const m = mensaje.toLowerCase();
  if (
    m.includes('agenda') || m.includes('reunión') || m.includes('reunion') ||
    (m.includes('cita') && (m.includes('crea') || m.includes('programa') || m.includes('mañana') || m.includes('hoy')))
  ) return 'agendar';

  if (
    (m.includes('actualiza') || m.includes('cambia') || m.includes('modifica') || m.includes('pon')) &&
    (m.includes('excel') || m.includes('factura') || m.includes('hoja') || m.includes('estado'))
  ) return 'editar_excel';

  if (
    m.includes('recuérdame') || m.includes('recuerdame') ||
    m.includes('recordatorio') || m.includes('avísame') ||
    m.includes('avisame') || m.includes('notifícame') || m.includes('notificame')
  ) return 'notificar';

  return null;
}

// Usa Haiku para extraer parámetros estructurados del mensaje (una sola llamada API barata)
async function extraerParametrosAccion(tipo, mensaje) {
  const ctx = getContextoTemporal();
  const mañana = new Date(Date.now() + 86400000);
  const mañanaStr = mañana.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const mañanaISO = mañana.toISOString().split('T')[0];

  const prompts = {
    agendar: `Fecha de hoy: ${ctx.fecha} (${ctx.diaSemana}), hora: ${ctx.hora}. Mañana es ${mañanaStr} (ISO: ${mañanaISO}).
Extrae los parámetros para crear un evento en Outlook Calendar.
Responde SOLO con JSON válido (sin markdown, sin texto extra):
{"titulo":"string","fechaISO":"YYYY-MM-DD HH:mm","duracion":60,"persona":"string o vacío","confirmacion":"Voy a [descripción concisa]. ¿Confirmas?"}`,

    editar_excel: `Extrae los parámetros para editar una celda en un archivo Excel.
"columna" debe ser el nombre exacto de la columna tal como aparece en la cabecera.
"buscarValor" es el texto a buscar en la fila que se quiere modificar.
Responde SOLO con JSON válido (sin markdown):
{"buscarValor":"string","columna":"string","nuevoValor":"string","confirmacion":"Voy a [descripción concisa]. ¿Confirmas?"}`,

    notificar: `Hora actual: ${ctx.hora}. Extrae los parámetros del recordatorio.
Si dice "en X minutos" o "en X horas", calcula el delay total en minutos. Si es inmediato, minutos=0.
Responde SOLO con JSON válido (sin markdown):
{"titulo":"Fractal","cuerpo":"string descriptivo del recordatorio","minutos":0,"confirmacion":"Voy a [descripción concisa]. ¿Confirmas?"}`
  };

  try {
    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        messages: [{ role: 'user', content: `${prompts[tipo]}\n\nMensaje: "${mensaje}"` }]
      })
    });
    const data = await respuesta.json();
    const texto = (data.content?.[0]?.text || '{}')
      .replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const params = JSON.parse(texto);
    return { esAccion: true, tipo, parametros: params, confirmacion: params.confirmacion };
  } catch {
    return { esAccion: false };
  }
}

function App() {
  const [memorias, setMemorias] = useState(() => {
    const guardadas = localStorage.getItem('fractal-memorias');
    return guardadas ? JSON.parse(guardadas) : [
      {
        id: 1,
        texto: "Fractal no es software. Es un lenguaje común entre mente humana y cognición artificial.",
        fecha: "27 mayo 2026",
        anclada: false,
        constelacion: "Visión"
      }
    ];
  });

  const [invocando, setInvocando] = useState('');
  const [pendiente, setPendiente] = useState(null);
  const [constelacionInput, setConstelacionInput] = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const [modoConfirmacion, setModoConfirmacion] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);

  const reconocimientoRef = useRef(null);
  const memoriasRef = useRef(memorias);
  const ultimoMensajeRef = useRef('');
  // Refs espejo para acceso desde closures async (rec.onresult, utterance.onend)
  const modoConfirmacionRef = useRef(false);
  const accionPendienteRef = useRef(null);

  useEffect(() => { memoriasRef.current = memorias; }, [memorias]);
  useEffect(() => { modoConfirmacionRef.current = modoConfirmacion; }, [modoConfirmacion]);
  useEffect(() => { accionPendienteRef.current = accionPendiente; }, [accionPendiente]);

  useEffect(() => {
    localStorage.setItem('fractal-memorias', JSON.stringify(memorias));
  }, [memorias]);

  // Carga sesión anterior y lanza saludo inicial
  useEffect(() => {
    sesionAnterior = window.fractalFS?.leerSesion?.() || null;

    async function saludar() {
      try {
        const prompt = sesionAnterior?.ultimoMensaje
          ? `Saluda brevemente a Macarena al abrir Fractal. La última vez dijo: "${sesionAnterior.ultimoMensaje}". Una oración natural, como si retomáramos.`
          : 'Saluda brevemente a Macarena al abrir Fractal. Una oración, cálida.';
        const saludo = await preguntarAClaude(prompt);
        hablar(saludo);
      } catch (e) {
        console.error('Greeting error:', e);
      }
    }

    saludar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guarda el estado de la sesión al cerrar la ventana
  useEffect(() => {
    function guardarAlCerrar() {
      window.fractalFS?.guardarSesion?.({
        fecha: new Date().toISOString(),
        ultimoMensaje: ultimoMensajeRef.current,
        memorias: memoriasRef.current
      });
    }
    window.addEventListener('beforeunload', guardarAlCerrar);
    return () => window.removeEventListener('beforeunload', guardarAlCerrar);
  }, []);

  async function ejecutarAccion(accion) {
    const { tipo, parametros } = accion;
    try {
      if (tipo === 'agendar') {
        await window.fractalAcciones.agendarOutlook(parametros);
        hablar('Reunión agendada en tu calendario.');
      } else if (tipo === 'editar_excel') {
        const resultado = await window.fractalAcciones.editarExcel(parametros);
        hablar(`Listo. Actualicé ${resultado.columna} en ${resultado.archivo}.`);
      } else if (tipo === 'notificar') {
        if (parametros.minutos > 0) {
          await window.fractalAcciones.notificarEnMinutos(parametros);
          hablar(`Recordatorio en ${parametros.minutos} minuto${parametros.minutos === 1 ? '' : 's'}.`);
        } else {
          await window.fractalAcciones.notificar(parametros);
          hablar('Notificación enviada.');
        }
      }
    } catch (err) {
      console.error('Action execution error:', err);
      hablar('Hubo un problema al ejecutar la acción.');
    }
  }

  async function iniciarEscucha() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      hablar('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      hablar('No puedo acceder al micrófono.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'es-CL';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setEscuchando(true);

    rec.onresult = async (e) => {
      const texto = e.results[0][0].transcript;
      setEscuchando(false);

      // Si hay una acción esperando confirmación, procesar la voz directamente
      if (modoConfirmacionRef.current && accionPendienteRef.current) {
        const respuesta = texto.toLowerCase().trim();
        const confirmado = ['sí', 'si', 'confirmo', 'adelante', 'ok', 'dale', 'sip', 'claro'].some(
          p => respuesta === p || respuesta.startsWith(p + ' ')
        );
        const accion = accionPendienteRef.current;
        setModoConfirmacion(false);
        setAccionPendiente(null);
        if (confirmado) {
          hablar('Ejecutando.');
          await ejecutarAccion(accion);
        } else {
          hablar('Cancelado.');
        }
      } else {
        setInvocando(texto);
      }
    };

    rec.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      setEscuchando(false);
    };
    rec.onend = () => setEscuchando(false);

    reconocimientoRef.current = rec;
    rec.start();
  }

  async function handleKeyDown(e) {
    if (e.key !== 'Enter' || invocando.trim() === '') return;

    const texto = invocando.trim();
    setInvocando('');

    // Modo confirmación via teclado
    if (modoConfirmacion && accionPendiente) {
      const respuesta = texto.toLowerCase().trim();
      const confirmado = ['sí', 'si', 'confirmo', 'adelante', 'ok', 'dale', 'sip', 'claro'].some(
        p => respuesta === p || respuesta.startsWith(p + ' ')
      );
      setModoConfirmacion(false);
      setAccionPendiente(null);
      if (confirmado) {
        hablar('Ejecutando.');
        await ejecutarAccion(accionPendiente);
      } else {
        hablar('Cancelado.');
      }
      return;
    }

    ultimoMensajeRef.current = texto;

    // Detectar intento de acción por palabras clave (sin API call)
    const intento = detectarIntento(texto);
    if (intento) {
      const accion = await extraerParametrosAccion(intento, texto);
      if (accion.esAccion) {
        setAccionPendiente(accion);
        setModoConfirmacion(true);

        // Hablar la confirmación y escuchar la respuesta automáticamente al terminar
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(accion.confirmacion);
        utterance.lang = 'es-CL';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.onend = () => setTimeout(iniciarEscucha, 400);
        synth.speak(utterance);
        return;
      }
    }

    // Flujo normal de conversación con Claude
    const mencionaArchivo =
      texto.toLowerCase().includes('excel') ||
      texto.toLowerCase().includes('archivo') ||
      texto.toLowerCase().includes('carpeta') ||
      texto.toLowerCase().includes('documento') ||
      texto.toLowerCase().includes('factura') ||
      texto.toLowerCase().includes('busca');

    let contexto = '';

    if (mencionaArchivo && window.fractalFS) {
      try {
        hablar('Revisando tus archivos...');
        const home = window.fractalFS.rutaHome();
        const carpetaDocs = window.fractalFS.unirRuta(home, 'Documents');
        const archivos = window.fractalFS.leerCarpeta(carpetaDocs);
        const excels = archivos
          .filter(a => a.endsWith('.xlsx') || a.endsWith('.xls'))
          .slice(0, 3);

        for (const archivo of excels) {
          const ruta = window.fractalFS.unirRuta(carpetaDocs, archivo);
          const buffer = window.fractalFS.leerArchivoBuffer(ruta);
          const XLSX = await import('xlsx');
          const wb = XLSX.read(buffer, { type: 'buffer' });
          wb.SheetNames.forEach(nombre => {
            const hoja = wb.Sheets[nombre];
            const csv = XLSX.utils.sheet_to_csv(hoja);
            contexto += `Archivo: ${archivo} — Hoja: ${nombre}\n${csv.slice(0, 2000)}\n\n`;
          });
        }
      } catch (err) {
        console.error('Error leyendo archivos:', err);
      }
    }

    const respuesta = await preguntarAClaude(texto, contexto);
    hablar(respuesta);

    setPendiente({
      id: Date.now(),
      texto,
      fecha: getFecha(),
      anclada: false,
      constelacion: ''
    });
  }

  function handleConstelacion(e) {
    if (e.key === 'Enter') {
      const nueva = { ...pendiente, constelacion: constelacionInput.trim() };
      setMemorias([nueva, ...memorias]);
      setPendiente(null);
      setConstelacionInput('');
      hablar('Memoria anclada.');
    }
    if (e.key === 'Escape') {
      const nueva = { ...pendiente, constelacion: '' };
      setMemorias([nueva, ...memorias]);
      setPendiente(null);
      setConstelacionInput('');
      hablar('Guardado.');
    }
  }

  function toggleAnclar(id) {
    setMemorias(memorias.map(m =>
      m.id === id ? { ...m, anclada: !m.anclada } : m
    ));
  }

  const ancladas = memorias.filter(m => m.anclada);
  const normales = memorias.filter(m => !m.anclada);
  const constelaciones = [...new Set(
    memorias.map(m => m.constelacion).filter(c => c !== '')
  )];

  return (
    <div className="fractal-canvas">
      <div className="fractal-header">
        <span className="fractal-logo">Fractal</span>
        {constelaciones.length > 0 && (
          <div className="constelaciones-nav">
            {constelaciones.map(c => (
              <span key={c} className="constelacion-tag">{c}</span>
            ))}
          </div>
        )}
      </div>

      <div className="invoke-container">
        <div className="invoke-row">
          <input
            className={`invoke-field${modoConfirmacion ? ' confirmando' : ''}`}
            type="text"
            placeholder={modoConfirmacion ? 'Di sí para confirmar...' : 'Invocar...'}
            value={invocando}
            onChange={(e) => setInvocando(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`mic-btn ${escuchando ? 'escuchando' : ''}`}
            onClick={iniciarEscucha}
            title="Hablar"
          >
            {escuchando ? '●' : '○'}
          </button>
        </div>

        {pendiente && (
          <div className="constelacion-prompt">
            <span className="constelacion-hint">
              ¿A qué constelación pertenece? (Enter para confirmar · Escape para omitir)
            </span>
            <input
              className="constelacion-field"
              type="text"
              placeholder="nombre de la constelación..."
              value={constelacionInput}
              onChange={(e) => setConstelacionInput(e.target.value)}
              onKeyDown={handleConstelacion}
              autoFocus
            />
          </div>
        )}
      </div>

      {ancladas.length > 0 && (
        <div className="memorias-container">
          <span className="seccion-label">Ancladas</span>
          {ancladas.map((m) => (
            <Memoria
              key={m.id}
              texto={m.texto}
              fecha={m.fecha}
              anclada={m.anclada}
              constelacion={m.constelacion}
              onAnclar={() => toggleAnclar(m.id)}
            />
          ))}
        </div>
      )}

      <div className="memorias-container">
        {ancladas.length > 0 && (
          <span className="seccion-label">Memorias</span>
        )}
        {normales.map((m) => (
          <Memoria
            key={m.id}
            texto={m.texto}
            fecha={m.fecha}
            anclada={m.anclada}
            constelacion={m.constelacion}
            onAnclar={() => toggleAnclar(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
