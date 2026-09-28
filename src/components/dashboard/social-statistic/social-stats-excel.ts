import type { CommentCategory, SocialAnalysisResult } from '@/types/social-statistics.types';

export const CATEGORY_LABEL: Record<CommentCategory, string> = {
  positivo: 'Positivo',
  negativo: 'Negativo',
  neutral: 'Neutral',
  pregunta_o_solicitud: 'Pregunta o solicitud',
};

export const PLATFORM_LABEL = { YOUTUBE: 'YouTube', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram' } as const;

// Excel del análisis, armado en el navegador: los comentarios (datos
// personales de ciudadanos) nunca se guardan en el servidor, solo viajan en
// la respuesta a quien hizo el análisis. `exceljs` se carga solo al descargar.
export async function downloadAnalysisExcel(result: SocialAnalysisResult) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet('Resumen');
  summary.columns = [
    { header: 'Dato', key: 'k', width: 34 },
    { header: 'Valor', key: 'v', width: 90 },
  ];
  const { publication } = result;
  summary.addRows([
    { k: 'Red', v: PLATFORM_LABEL[publication.platform] },
    { k: 'Publicación', v: publication.title ?? '' },
    { k: 'Enlace', v: publication.url },
    { k: 'Comentarios en la publicación', v: result.totalComments },
    { k: 'Comentarios analizados', v: result.analyzedComments },
    ...(Object.keys(CATEGORY_LABEL) as CommentCategory[]).map((c) => ({
      k: `% ${CATEGORY_LABEL[c]}`,
      v: result.categories[c],
    })),
    { k: 'Resumen', v: result.summary ?? '' },
    { k: 'Temas', v: result.themes.join(' · ') },
    { k: 'Fecha del análisis', v: new Date(result.createdAt).toLocaleString('es-CO') },
  ]);
  summary.getRow(1).font = { bold: true };

  const comments = workbook.addWorksheet('Comentarios');
  comments.columns = [
    { header: 'Fecha', key: 'date', width: 20 },
    { header: 'Autor', key: 'author', width: 28 },
    { header: 'Comentario', key: 'text', width: 90 },
    { header: 'Me gusta', key: 'likes', width: 10 },
    { header: 'Categoría', key: 'category', width: 22 },
  ];
  comments.addRows(
    result.comments.map((c) => ({
      date: c.publishedAt ? new Date(c.publishedAt).toLocaleString('es-CO') : '',
      author: c.author ?? '',
      text: c.text,
      likes: c.likes,
      category: c.category ? CATEGORY_LABEL[c.category] : 'Sin clasificar',
    })),
  );
  comments.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `estadisticas_${publication.platform.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
