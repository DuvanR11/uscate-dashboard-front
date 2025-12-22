import { useEffect, useState } from "react";

/**
 * Hook para retrasar la actualización de un valor.
 * Útil para inputs de búsqueda para no saturar la API.
 * * @param value El valor que cambia frecuentemente (ej: texto del input)
 * @param delay El tiempo de espera en ms (default: 500ms)
 * @returns El valor retrasado
 */
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configuramos un timer que actualizará el valor después del delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay || 500);

    // Si el valor cambia antes de que termine el delay (el usuario sigue escribiendo),
    // limpiamos el timer anterior y empezamos uno nuevo.
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}