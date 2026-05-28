import { useState } from 'react';
import './App.css';
import Memoria from './Memoria';

function App() {
  const [memorias, setMemorias] = useState([
    {
      id: 1,
      texto: "Fractal no es software. Es un lenguaje común entre mente humana y cognición artificial.",
      fecha: "27 mayo 2026"
    }
  ]);
  const [invocando, setInvocando] = useState('');

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
        fecha: getFecha()
      };
      setMemorias([nueva, ...memorias]);
      setInvocando('');
    }
  }

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

      <div className="memorias-container">
        {memorias.map((m) => (
          <Memoria key={m.id} texto={m.texto} fecha={m.fecha} />
        ))}
      </div>
    </div>
  );
}

export default App;