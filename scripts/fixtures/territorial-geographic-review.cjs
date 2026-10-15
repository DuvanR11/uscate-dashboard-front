const workflowFixture = validation => ({
  pilot: validation.pilot, reportHash: validation.contentHash, revision: 0,
  geographicValidationClosed: false, submunicipalPublicationReady: false,
  reviewedCount: 0, publicationBlockers: ['Falta evidencia cartográfica suficiente.', 'Faltan resultados submunicipales conciliados y publicación explícita.'],
  operators: [{ id: 'e8ae98b7-79f0-481b-a97b-10f1739d9029', fullName: 'Operador de prueba', email: 'reviewer@example.test' }],
  targets: [
    ...validation.cases.map(c => ({ key: `CASE:${c.stationKey}`, title: c.names.join(' / '), requiredEvidence: 'Confirmar coordenadas y límites de 2023.' })),
    ...validation.requirements.map(r => ({ key: `REQ:${r.code}`, title: r.title, requiredEvidence: r.requiredEvidence })),
  ].map(t => ({ ...t, assignee: null, status: 'PENDING', decision: null, evidence: [], eventCount: 0 })),
  history: [], nextBeforeRevision: null,
});
module.exports = { workflowFixture };
