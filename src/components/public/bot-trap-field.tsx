/**
 * Trampa para bots de los formularios públicos (Fase 0 del análisis de punta
 * a punta, 2026-10-28, GOB-13/CRM-16). Una persona no ve este campo ni llega a
 * él con el teclado o con un lector de pantalla; un bot que rellena todo sí lo
 * llena, y entonces el servidor responde como si guardara sin guardar nada.
 *
 * Quien lo use manda el valor como `website: website || undefined`: vacío no
 * viaja, así el formulario sirve también con un servidor anterior a la trampa.
 */
export function BotTrapField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor={id}>Sitio web</label>
      <input
        id={id}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
