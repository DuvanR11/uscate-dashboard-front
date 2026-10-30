"use client";
import {
  LegalError,
  LegalLoading,
  legalDate,
  useLegalResource,
} from "./legal-ui";

type Report = {
  from: string;
  to: string;
  responses: number;
  timely: number;
  responseOnTimePercent: number | null;
  canSupervise: boolean;
  team: {
    id: string;
    fullName: string;
    active: number;
    overdue: number;
    tasksDone: number;
    tasksPending: number;
  }[];
};
export function LegalReports() {
  const report = useLegalResource<Report>("/petitions/workspace/reports");
  if (report.loading) return <LegalLoading />;
  if (report.error)
    return <LegalError message={report.error} retry={report.reload} />;
  if (!report.data) return null;
  const data = report.data;
  return (
    <section className="space-y-4 border-t pt-5">
      <h3 className="font-semibold">
        {data.canSupervise
          ? "Carga de trabajo del equipo"
          : "Mi carga de trabajo"}
      </h3>
      <p className="text-sm text-muted-foreground">
        Actividad del {legalDate(data.from)} al {legalDate(data.to)}. La carga
        pendiente refleja el estado actual.
      </p>
      <p className="rounded-lg bg-muted/50 p-4 text-sm">
        {data.responseOnTimePercent === null
          ? "Aún no hay respuestas registradas en este periodo con término calculado."
          : `${data.timely} de ${data.responses} respuestas fueron recibidas dentro de la fecha límite (${data.responseOnTimePercent} %).`}{" "}
        La oportunidad de recepción se mide por separado de la suficiencia
        jurídica de la respuesta.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 pr-4">Responsable</th>
              <th className="p-3">Expedientes activos</th>
              <th className="p-3">Vencidos</th>
              <th className="p-3">Tareas pendientes</th>
              <th className="p-3">Tareas terminadas en el periodo</th>
            </tr>
          </thead>
          <tbody>
            {data.team.map((user) => (
              <tr className="border-b" key={user.id}>
                <td className="py-3 pr-4 font-medium">{user.fullName}</td>
                <td className="p-3">{user.active}</td>
                <td className="p-3">{user.overdue}</td>
                <td className="p-3">{user.tasksPending}</td>
                <td className="p-3">{user.tasksDone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
