import { useState } from "react";

// Autocompletado que sugiere categorías ya usadas antes por el usuario a
// medida que escribe (ej. "net" -> Netflix). Si no coincide con ninguna
// existente, el texto se trata como una categoría nueva.
export default function AutocompletadoCategoria({ categorias, valor, onChange, placeholder = "Categoría" }) {
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const sugerencias = valor.trim()
    ? categorias.filter((c) => c.nombre.toLowerCase().includes(valor.trim().toLowerCase())).slice(0, 6)
    : [];

  function handleSeleccionar(categoria) {
    onChange(categoria.nombre, categoria.id);
    setMostrarSugerencias(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => {
          onChange(e.target.value, null);
          setMostrarSugerencias(true);
        }}
        onFocus={() => setMostrarSugerencias(true)}
        onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
      {mostrarSugerencias && sugerencias.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded shadow mt-1 max-h-40 overflow-auto">
          {sugerencias.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => handleSeleccionar(c)}
              className="px-3 py-2 text-sm hover:bg-purple-50 cursor-pointer"
            >
              {c.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
