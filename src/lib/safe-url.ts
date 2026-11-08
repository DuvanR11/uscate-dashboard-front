/**
 * Un enlace que se puede abrir en el navegador. Una noticia cargada a mano
 * puede traer `manual://ingestion` o el nombre del medio en lugar de un
 * enlace: esa no se convierte en botón.
 */
export function isWebUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value.trim());
}
