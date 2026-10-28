

export const ACTION_LABEL: Record<string, string> = {
  // Recorrido de alta (Fase 4, 2026-10-18): acciones que ya están en la
  // auditoría de producción y salían con su código interno.
  ACTIVATE_TERRITORIAL_PILOT_TRIAL: 'Prueba piloto territorial activada',
  CREATE_TERRITORIAL_DATA_DRAFT: 'Borrador de datos territoriales creado',
  DOWNLOAD_PRIVATE_TERRITORIAL_REPORT: 'Informe territorial privado descargado',
  DOWNLOAD_TERRITORIAL_EVIDENCE: 'Evidencia territorial descargada',
  GENERATE_ORGANIZATION_TERRITORIAL_EXPORT: 'Exportación territorial generada',
  GENERATE_PRIVATE_TERRITORIAL_REPORT: 'Informe territorial privado generado',
  PREPARE_TERRITORIAL_RESULT_VERSION: 'Versión de resultados preparada',
  PUBLISH_TERRITORIAL_RESULT_VERSION: 'Versión de resultados publicada',
  REGISTER_ADDON: 'Complemento registrado',
  REQUEST_TERRITORIAL_REPORT: 'Informe territorial solicitado',
  REVIEW_TERRITORIAL_GEOGRAPHY: 'Geografía territorial revisada',
  REVIEW_TERRITORIAL_RESULT_VERSION: 'Versión de resultados revisada',
  STORE_TERRITORIAL_EVIDENCE: 'Evidencia territorial guardada',
  SUPERSEDE_TERRITORIAL_RESULT_VERSION: 'Versión de resultados reemplazada',
  SUPPORT_ATTENTION_CONFIG: 'Horario de atención de soporte actualizado',
  TERRITORIAL_GEOGRAPHIC_REVIEW: 'Revisión geográfica territorial',
  TERRITORIAL_HEALTH_COMPLETE: 'Revisión de salud territorial completada',
  TERRITORIAL_HEALTH_EXPORT: 'Revisión de salud territorial exportada',
  TERRITORIAL_HEALTH_REQUEST: 'Revisión de salud territorial solicitada',
  TERRITORIAL_HEALTH_SCHEDULE_UPDATE: 'Calendario de salud territorial actualizado',
  TERRITORIAL_HEALTH_SCHEDULE_SKIP: 'Revisión de salud territorial omitida',
  TERRITORIAL_HEALTH_SCHEDULE_BLOCK: 'Revisión de salud territorial bloqueada',
  REVOKE_TERRITORIAL_GEOGRAPHY: 'Revisión geográfica territorial revocada',
  TERRITORIAL_RECONCILIATION_OBSERVE: 'Conciliación territorial con observación',
  TERRITORIAL_RECONCILIATION_REGISTER: 'Conciliación territorial registrada',
  TERRITORIAL_RECONCILIATION_REOPEN: 'Conciliación territorial reabierta',
  TERRITORIAL_RECONCILIATION_REVIEW: 'Conciliación territorial revisada',
  TERRITORIAL_RECONCILIATION_WITHDRAW: 'Conciliación territorial retirada',
  TERRITORIAL_REGISTRY_UPDATE: 'Registro territorial actualizado',
  TERRITORIAL_REGIONAL_SOURCE_REGISTER: 'Expediente regional reservado',
  TERRITORIAL_REGIONAL_SOURCE_STORE_ORIGINAL: 'Original regional almacenado',
  TERRITORIAL_REGIONAL_SOURCE_REVIEW: 'Revisión documental regional',
  TERRITORIAL_REGIONAL_SOURCE_REJECT: 'Fuente regional rechazada',
  TERRITORIAL_REGIONAL_SOURCE_WITHDRAW: 'Fuente regional retirada',
  TERRITORIAL_REGIONAL_SOURCE_DOWNLOAD: 'Descarga de original regional autorizada',
  APPLY_COMMERCIAL_ORDER: 'Ingreso conciliado aplicado al plan',
  CREATE_COLLECTION_ORDER: 'Orden de cobro creada',
  SUBMIT_TRANSFER_REVIEW: 'Comprobante enviado a revisión',
  ADD_TRANSFER_INFORMATION: 'Información de transferencia completada',
  REVIEW_TRANSFER: 'Transferencia revisada por Finanzas',
  ISSUE_COMMERCIAL_QUOTE: 'Cotización emitida',
  ACCEPT_COMMERCIAL_QUOTE: 'Cotización aceptada',
  UPDATE_OPERATIONAL_ALERT: 'Seguimiento de alerta actualizado',
  CREATE_INFRASTRUCTURE_COST: 'Costo de infraestructura registrado',
  UPDATE_INFRASTRUCTURE_COST: 'Costo de infraestructura corregido',
  UPDATE_PLATFORM_STAFF: 'Permisos internos actualizados',
  ACTIVATE_PLATFORM_SECURITY: 'Control de permisos actualizado',
  DESIGNATE_PLATFORM_PRINCIPAL: 'Administrador principal designado',
  REQUEST_PLATFORM_EXCEPTION: 'Excepción solicitada',
  DECIDE_PLATFORM_EXCEPTION: 'Excepción decidida',
  CREATE_ORGANIZATION: 'Organización creada',
  ELECTORAL_PROFILE_UPDATE: 'Ficha electoral y equipo actualizados',
  TERRITORIAL_CONTRACT_CREATE: 'Anexo territorial preparado',
  TERRITORIAL_CONTRACT_ACCEPT: 'Anexo territorial aceptado por el cliente',
  TERRITORIAL_CONTRACT_REQUEST_APPROVAL: 'Aprobación de cobertura solicitada',
  TERRITORIAL_CONTRACT_ACTIVATE: 'Cobertura territorial activada',
  TERRITORIAL_CONTRACT_REVOKE: 'Anexo territorial revocado',
  UPDATE_PLAN: 'Plan cambiado',
  UPDATE_LIMITS: 'Cupos ajustados',
  IMPERSONATE: 'Entró como',
  UPDATE_OSINT_SOURCE: 'Fuente OSINT editada',
  CREATE_OSINT_SOURCE: 'Fuente OSINT publicada',
  REGISTER_PAYMENT: 'Pago registrado',
  VOID_PAYMENT: 'Pago anulado',
  SET_PERIOD: 'Vigencia otorgada',
  CANCEL_SUBSCRIPTION: 'Suscripción cancelada',
  REACTIVATE_SUBSCRIPTION: 'Suscripción reactivada',
  SUBSCRIPTION_STATE_CHANGED: 'Cambio de estado',
  PAY_COMMISSION_INSTALLMENT: 'Comisión pagada',
  ORGANIZATION_DATA_EXPORTED: 'Datos exportados',
  PASSWORD_RESET_LINK_CREATED: 'Enlace de recuperación',
  UPDATE_WHATSAPP_BOT: 'WhatsApp no oficial',
  UPDATE_COMMERCIAL_PLAN: 'Plan comercial editado',
  UPDATE_SALES_LEAD: 'Interesado actualizado',
  CREATE_MANAGEMENT: 'Gestión registrada',
  UPDATE_MANAGEMENT: 'Gestión actualizada',
  // Fase 3 del análisis de punta a punta (2026-10-28, PLT-20): publicar un
  // documento legal ahora deja auditoría con quién lo hizo.
  PUBLISH_LEGAL_DOCUMENT: 'Documento legal publicado',
};

/**
 * Nombre de una acción de auditoría para mostrar. Un código sin nombre
 * todavía (algunos se arman con prefijo + sufijo) nunca se muestra crudo
 * (recorrido de alta, Fase 4, 2026-10-18).
 */
export function actionLabel(action: string): string {
  return (
    ACTION_LABEL[action] ??
    (action.includes('TERRITORIAL') ? 'Acción del módulo territorial' : 'Acción interna')
  );
}
