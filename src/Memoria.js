function Memoria({ texto, fecha, anclada, constelacion, onAnclar }) {
  return (
    <div className={`memoria ${anclada ? 'memoria-anclada' : ''}`}>
      {constelacion && (
        <span className="memoria-constelacion">{constelacion}</span>
      )}
      <p className="memoria-texto">{texto}</p>
      <div className="memoria-footer">
        <span className="memoria-fecha">{fecha}</span>
        <button
          className={`anclar-btn ${anclada ? 'anclada' : ''}`}
          onClick={onAnclar}
        >
          {anclada ? 'Anclada' : 'Anclar'}
        </button>
      </div>
    </div>
  );
}

export default Memoria;