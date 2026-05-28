import { useState, useEffect } from 'react';
import './App.css';
import Memoria from './Memoria';

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

  useEffect(() => {
    localStorage.setItem('fractal-memorias', JSON.stringify(memorias));
  }, [memorias]);

  function getFecha() {
    return new Date().toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && invocando.trim() !== '') {
      setPendiente({
        id: Date.now(),
        texto: invocando.trim(),
        fecha: getFecha(),
        anclada: false,
        constelacion: ''
      });
      setInvocando('');
    }
  }

  function handleConstelacion(e) {
    if (e.key === 'Enter') {
      const nueva = {
        ...pendiente,
        constelacion: constelacionInput.trim()
      };
      setMemorias([nueva, ...memorias]);
      setPendiente(null);
      setConstelacionInput('');
    }
    if (e.key === 'Escape') {
      const nueva = { ...pendiente, constelacion: '' };
      setMemorias([nueva, ...memorias]);
      setPendiente(null);
      setConstelacionInput('');
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
        <input
          className="invoke-field"
          type="text"
          placeholder="Invocar..."
          value={invocando}
          onChange={(e) => setInvocando(e.target.value)}
          onKeyDown={handleKeyDown}
        />
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