import { useEffect, useRef, useState } from "react";

// Reemplazo de window.prompt() nativo (feo, no se puede estilizar, y en
// iOS Safari se ve como una alerta del sistema operativo) por un modal
// propio con la misma idea (titulo + input + Cancelar/Aceptar) pero con
// una apariencia mas cuidada, tipo alerta de iOS.
export default function PromptModal({
  abierto, titulo, mensaje, valorInicial = "", tipo = "text", onAceptar, onCancelar,
}) {
  const [valor, setValor] = useState(valorInicial);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    setValor(valorInicial);
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(id);
  }, [abierto, valorInicial]);

  if (!abierto) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onAceptar(valor);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-base font-semibold text-gray-900 text-center">{titulo}</h3>
          {mensaje && <p className="text-sm text-gray-500 text-center mt-1">{mensaje}</p>}
          <input
            ref={inputRef}
            type={tipo}
            step={tipo === "number" ? "0.01" : undefined}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="mt-4 w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex border-t border-gray-200 text-sm">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-3 text-gray-500 hover:bg-gray-50 border-r border-gray-200"
          >
            Cancelar
          </button>
          <button type="submit" className="flex-1 py-3 text-purple-600 font-semibold hover:bg-purple-50">
            Aceptar
          </button>
        </div>
      </form>
    </div>
  );
}
