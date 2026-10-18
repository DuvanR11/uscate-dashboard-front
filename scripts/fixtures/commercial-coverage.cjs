const when = "2026-10-17T15:00:00.000Z";
const item = (code = "NEIVA_CONCEJO_2023", available = true) => ({
  code,
  name: available ? "Concejo de Neiva" : "Synthetic regional context",
  election: { code: "CO_TERRITORIALES_2023", name: "Territoriales 2023" },
  corporation: {
    code: available ? "CONCEJO" : "ALCALDIA",
    name: available ? "Concejo" : "Alcaldia",
  },
  territory: {
    code: available ? "41001" : "05001",
    name: available ? "Neiva" : "Medellin",
    level: "MUNICIPAL",
  },
  constituencyCode: "GENERAL",
  status: available ? "AVAILABLE_MUNICIPAL" : "PREPARING",
  sources: {
    registered: available ? 3 : 0,
    reviewed: available ? 3 : 0,
    origin: available ? "LEGACY_BATCH" : "REGIONAL",
  },
  blockers: available
    ? []
    : [
        {
          code: "READER_PENDING",
          message: "Falta un lector publicado para este territorio.",
        },
      ],
  publication: available
    ? { number: 2, publishedAt: when, granularity: "MUNICIPAL" }
    : null,
  monitoring: {
    enabled: false,
    workerEnabled: false,
    blockedReason: null,
    nextRunAt: null,
    responsible: null,
    lastStatus: null,
    lastFinishedAt: null,
    openAlerts: 0,
  },
});
const page = () => ({
  checkedAt: when,
  pageSize: 20,
  next: null,
  items: [item(), item("MEDELLIN_ALCALDIA_2023", false)],
  limitations: ["La consulta no concede acceso comercial."],
});
const organizations = () => ({
  datasetCode: "NEIVA_CONCEJO_2023",
  checkedAt: when,
  pageSize: 10,
  next: null,
  note: "Synthetic organizations only",
  items: [
    {
      id: "qa-org",
      name: "Organizacion de prueba",
      access: {
        status: "READ_ONLY",
        mode: "DEMO",
        startsAt: when,
        endsAt: when,
      },
      availability: "AVAILABLE",
      canExplore: true,
      origins: ["LEGACY_PILOT"],
    },
  ],
});
module.exports = { when, item, page, organizations };
