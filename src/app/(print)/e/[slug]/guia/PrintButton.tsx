'use client';

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="focus-ring brand-gradient rounded-lg px-3.5 py-2 text-sm font-medium text-white">
      Imprimir o guardar como PDF
    </button>
  );
}
