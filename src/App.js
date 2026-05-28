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
        anclada: false
      }
    ];
  });
  const [invocando, setInvocando] = useState('');

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
      const nueva = {
        id: Date.now(),
        texto: invocando.trim(),
        fecha: getFecha(),
        anclada: false
      };
      setMemorias([nueva, ...memorias]);
      setInvocando('');
    }
  }

  function toggleAnclar(id) {
    setMemorias(memorias.map(m =>
      m.id === id ? { ...m, anclada: !m.anclada } : m
    ));
  }

  const ancladas = memorias.filter(m => m.anclada);
  const normales = memorias.filter(m => !m.anclada);

  return (
    <div className="fractal-canvas">
      <div className="fractal-header">
        <span className="fractal-logo">Fractal</span>
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
            onAnclar={() => toggleAnclar(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;