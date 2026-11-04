import api from '@/lib/api';

export interface TrainingProgress {
  enrollmentId: string | null;
  completedLessons: string[];
  percent: number;
  quizPassed: boolean;
  bestScore: number;
  practiceStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED';
  practiceEvidence: string | null;
  practiceFeedback: string | null;
  practiceSubmittedAt: string | null;
  certificateId: string | null;
  completedAt: string | null;
}
export interface TrainingCourseSummary {
  id: string;
  version: number;
  title: string;
  description: string;
  audience: string;
  category: string;
  prerequisite: string | null;
  minutes: number;
  lessonCount: number;
  progress: TrainingProgress;
}
export interface TrainingCourse {
  video?: {
    src: string;
    captions: string;
    poster: string;
    narration: string;
  } | null;
  id: string;
  version: number;
  title: string;
  description: string;
  audience: string;
  category: string;
  prerequisite?: string;
  practice: string;
  rubric: string[];
  lessons: {
    id: string;
    title: string;
    minutes: number;
    paragraphs: string[];
    steps: string[];
    guide?: string;
  }[];
  questions: { id: string; prompt: string; options: string[] }[];
  progress: TrainingProgress;
}
export interface TrainingCatalog {
  canReview: boolean;
  courses: TrainingCourseSummary[];
}
export interface TrainingResult {
  score: number;
  passed: boolean;
  feedback: { id: string; correct: boolean; explanation: string }[];
  course: TrainingCourse;
}
export interface TrainingTeam {
  page: number;
  pageSize: number;
  total: number;
  items: {
    id: string;
    userId: string;
    learner: string;
    email: string;
    organizationId: string | null;
    courseTitle: string;
    courseVersion: number;
    practice: string;
    rubric: string[];
    progress: TrainingProgress | null;
    canReview: boolean;
  }[];
}
export const getTraining = async () => {
  const { data } = await api.get<TrainingCatalog>('/training');
  if (!Array.isArray(data.courses))
    throw new Error('No se pudo leer el catálogo de capacitación.');
  return data;
};
export const getTrainingCourse = async (id: string) =>
  (await api.get<TrainingCourse>(`/training/courses/${encodeURIComponent(id)}`))
    .data;
export const startTraining = async (id: string) =>
  (
    await api.post<TrainingCourse>(
      `/training/courses/${encodeURIComponent(id)}/start`,
    )
  ).data;
export const completeTrainingLesson = async (id: string, lesson: string) =>
  (
    await api.post<TrainingCourse>(
      `/training/courses/${encodeURIComponent(id)}/lessons/${encodeURIComponent(lesson)}/complete`,
    )
  ).data;
export const assessTraining = async (
  id: string,
  answers: Record<string, number>,
) =>
  (
    await api.post<TrainingResult>(
      `/training/courses/${encodeURIComponent(id)}/assessment`,
      { answers },
    )
  ).data;
export const submitTrainingPractice = async (id: string, evidence: string) =>
  (
    await api.post<TrainingCourse>(
      `/training/courses/${encodeURIComponent(id)}/practice`,
      { evidence },
    )
  ).data;
export const getTrainingTeam = async (page: number) =>
  (await api.get<TrainingTeam>('/training/team', { params: { page } })).data;
export const reviewTrainingPractice = async (
  id: string,
  decision: 'APPROVED' | 'CHANGES_REQUESTED',
  feedback: string,
  submittedAt: string,
) =>
  (
    await api.post(`/training/team/${encodeURIComponent(id)}/review`, {
      decision,
      feedback,
      submittedAt,
    })
  ).data;

export async function downloadTrainingCertificate(id: string) {
  const { data } = await api.get<{
    id: string;
    learner: string;
    course: string;
    version: number;
    score: number;
    completedAt: string;
    statement: string;
  }>(`/training/certificates/${encodeURIComponent(id)}`);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape' });
  pdf.setDrawColor(15, 118, 110);
  pdf.setLineWidth(1);
  pdf.rect(12, 12, 273, 186);
  pdf.setTextColor(15, 118, 110);
  pdf.setFontSize(16);
  pdf.text('ZYRON · CAPACITACIÓN', 148.5, 34, { align: 'center' });
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(27);
  pdf.text('Constancia de aprobación', 148.5, 56, { align: 'center' });
  pdf.setFontSize(20);
  pdf.text(pdf.splitTextToSize(data.learner, 235), 148.5, 80, {
    align: 'center',
  });
  pdf.setFontSize(15);
  pdf.text(pdf.splitTextToSize(data.course, 235), 148.5, 105, {
    align: 'center',
  });
  pdf.setFontSize(11);
  pdf.text(
    `Versión ${data.version} · Evaluación ${data.score}/100 · ${new Date(data.completedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`,
    148.5,
    127,
    { align: 'center' },
  );
  pdf.text(pdf.splitTextToSize(data.statement, 225), 36, 147);
  pdf.setFontSize(9);
  pdf.text(`Registro interno: ${data.id}`, 36, 181);
  pdf.save(`constancia-zyron-${data.id}.pdf`);
}
