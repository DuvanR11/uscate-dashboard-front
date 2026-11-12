'use client';

/**
 * `/<enlace>/encuesta/<token>` — Plan hacia la versión estable, Fase 4
 * (2026-11-10). Encuesta pública de una campaña, con su marca (la pone el
 * layout de `[orgSlug]`). Se responde anónima o, si la persona quiere, con su
 * cédula, nombre y celular más la autorización de datos. La página no muestra
 * nada de nadie: solo las preguntas y «gracias». Los dos textos de la persona
 * (arriba y en la casilla) los aprobó el abogado el 2026-11-11 y vienen del
 * servidor con el nombre de la campaña.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BotTrapField } from '@/components/public/bot-trap-field';
import { usePublicBrand } from '@/components/public/campaign-brand';
import { SurveyAnswerForm } from '@/components/dashboard/surveys/survey-answer-form';
import {
  answersToSend,
  missingRequired,
  publicSurveysApi,
  type AnswerInput,
  type PublicSurvey,
} from '@/lib/api/surveys';

// El texto aprobado termina en «su aviso de privacidad»: esa frase lleva a la
// página de privacidad, como en los demás formularios públicos.
const PRIVACY_PHRASE = 'aviso de privacidad';
function ConsentText({ text }: { text: string }) {
  const at = text.lastIndexOf(PRIVACY_PHRASE);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-medium underline">
        {PRIVACY_PHRASE}
      </a>
      {text.slice(at + PRIVACY_PHRASE.length)}
    </>
  );
}

// Solo el texto: una lista es la validación del DTO, en inglés.
function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  return 'No pudimos registrar tu respuesta. Revisa tu conexión e inténtalo de nuevo.';
}

export default function PublicSurveyPage() {
  const { orgSlug, token } = useParams<{ orgSlug: string; token: string }>();
  const brandName = usePublicBrand()?.name;
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'failed' | 'ready'>('loading');
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [identify, setIdentify] = useState(false);
  const [documentNumber, setDocumentNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orgSlug || !token) return;
    publicSurveysApi
      .get(orgSlug, token)
      .then((value) => {
        setSurvey(value);
        setState('ready');
      })
      .catch((e: unknown) => {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setState(status === 404 ? 'missing' : 'failed');
      });
  }, [orgSlug, token]);

  const identityReady =
    !identify ||
    (documentNumber.trim().length >= 5 &&
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      phone.replace(/\D/g, '').length >= 10 &&
      consent);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!survey) return;
    if (missingRequired(survey.questions, answers)) {
      setError('Responde las preguntas obligatorias.');
      return;
    }
    if (!identityReady) {
      setError('Completa tus datos y la autorización, o responde de forma anónima.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await publicSurveysApi.respond(orgSlug, token, {
        answers: answersToSend(answers),
        ...(identify
          ? {
              documentNumber: documentNumber.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              dataTreatment: consent,
            }
          : {}),
        website: website || undefined,
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-xl">
        {state === 'loading' ? (
          <div className="flex h-60 items-center justify-center" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
          </div>
        ) : state === 'missing' ? (
          <section className="rounded-xl border bg-white p-8 text-center dark:bg-slate-900">
            <ClipboardList aria-hidden className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Esta encuesta no está disponible
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Ya se cerró o el enlace no está completo. Pídele a quien te lo compartió que te lo envíe de nuevo.
            </p>
          </section>
        ) : state === 'failed' || !survey ? (
          <p className="rounded-lg border bg-white p-6 text-center text-sm text-slate-600 dark:bg-slate-900">
            No pudimos cargar la encuesta. Revisa tu conexión y vuelve a abrir el enlace.
          </p>
        ) : done ? (
          <section className="rounded-xl border bg-white p-8 text-center dark:bg-slate-900" role="status">
            <CheckCircle2 aria-hidden className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">¡Gracias por responder!</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tu respuesta quedó registrada.</p>
          </section>
        ) : (
          <form
            onSubmit={(e) => void submit(e)}
            className="space-y-6 rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-8"
          >
            <header className="space-y-2">
              {brandName && (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{brandName}</p>
              )}
              <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">{survey.title}</h1>
              {survey.description && (
                <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{survey.description}</p>
              )}
              <p className="text-xs text-slate-500">{survey.notice.intro}</p>
            </header>

            <SurveyAnswerForm
              idPrefix="public-survey"
              questions={survey.questions}
              value={answers}
              onChange={setAnswers}
              disabled={sending}
            />

            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">¿Cómo respondes?</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Cómo respondes">
                <Button
                  type="button"
                  role="radio"
                  aria-checked={!identify}
                  variant={!identify ? 'default' : 'outline'}
                  onClick={() => setIdentify(false)}
                >
                  De forma anónima
                </Button>
                <Button
                  type="button"
                  role="radio"
                  aria-checked={identify}
                  variant={identify ? 'default' : 'outline'}
                  onClick={() => setIdentify(true)}
                >
                  Con mis datos
                </Button>
              </div>
              {identify && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-500">
                    Así la campaña puede contactarte. Si ya estás registrado, no cambiamos tus datos.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="survey-document">Cédula</Label>
                    <Input
                      id="survey-document"
                      inputMode="numeric"
                      maxLength={20}
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="survey-first-name">Nombre</Label>
                      <Input
                        id="survey-first-name"
                        maxLength={80}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="survey-last-name">Apellido</Label>
                      <Input
                        id="survey-last-name"
                        maxLength={80}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="survey-phone">Celular</Label>
                    <Input
                      id="survey-phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={20}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <Checkbox
                      id="survey-consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="survey-consent"
                      className="block cursor-pointer text-xs font-normal leading-snug text-slate-600 dark:text-slate-300"
                    >
                      <ConsentText text={survey.notice.consent} />
                    </Label>
                  </div>
                </div>
              )}
            </fieldset>

            <BotTrapField id="survey-website" value={website} onChange={setWebsite} />

            {error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={sending || answersToSend(answers).length === 0 || !identityReady}
            >
              {sending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              Enviar mis respuestas
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
