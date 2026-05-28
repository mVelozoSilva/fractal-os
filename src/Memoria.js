function Memoria({ texto, fecha }) {
  return (
    <div className="memoria">
      <p className="memoria-texto">{texto}</p>
      <span className="memoria-fecha">{fecha}</span>
    </div>
  );
}

export default Memoria;