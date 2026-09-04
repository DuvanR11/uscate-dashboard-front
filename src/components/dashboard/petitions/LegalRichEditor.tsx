'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Mejora de UX del editor (2026-09-03) — hallazgo real encontrado al
// revisar el componente: Tiptap v3 SOLO lee el `content` inicial en el
// momento de crear el editor — `editor.setOptions()` (lo que
// `useEditor()` llama internamente cuando el prop `value` cambia) NUNCA
// vuelve a aplicar el contenido al documento real (confirmado leyendo
// `Editor.setOptions()` en `@tiptap/core`: solo reaplica `editorProps` y
// re-renderiza el estado YA existente, nunca llama a `setContent`). Esto
// significa que, sin el `useEffect` de abajo, el editor se quedaba
// mostrando el documento VIEJO después de generar con IA, cargar otra
// petición o pulsar "Nueva respuesta" — mientras la pestaña "Vista
// previa" (que sí lee `formData.generatedDraft` directo) mostraba el
// contenido correcto. Bug real de "el editor no se actualiza", no
// hipotético.
const HEADING_LEVELS = [1, 2, 3] as const;

const TEXT_STYLE_OPTIONS = [
  { value: 'paragraph', label: 'Párrafo normal' },
  { value: 'heading-1', label: 'Título principal' },
  { value: 'heading-2', label: 'Sección' },
  { value: 'heading-3', label: 'Subsección' },
];

export function LegalRichEditor({
  value,
  onChange,
  disabled,
  letterhead,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  letterhead?: React.ReactNode;
}) {
  const editor = useEditor({
    // SSR en Next.js: sin esto, Tiptap detecta el server y lo apaga solo
    // (con una advertencia real en consola) — se declara explícito para
    // que el comportamiento sea determinista, no un fallback silencioso.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder:
          'Comienza a redactar el derecho de petición, o genera un borrador con el asistente de IA a la izquierda.',
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Reactividad real del toolbar: Tiptap v3 no re-renderiza el componente
  // en cada transacción por defecto (`shouldRerenderOnTransaction` es
  // `false` salvo que se pida) — sin esto, los botones nunca reflejaban
  // si el cursor estaba sobre texto en negrita, un título, etc., ni el
  // undo/redo se deshabilitaba nunca aunque no hubiera nada que deshacer.
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return null;

      const activeHeadingLevel = HEADING_LEVELS.find((level) =>
        ctx.editor!.isActive('heading', { level }),
      );

      return {
        isBold: ctx.editor.isActive('bold'),
        isItalic: ctx.editor.isActive('italic'),
        isUnderline: ctx.editor.isActive('underline'),
        isBulletList: ctx.editor.isActive('bulletList'),
        isOrderedList: ctx.editor.isActive('orderedList'),
        isBlockquote: ctx.editor.isActive('blockquote'),
        alignLeft: ctx.editor.isActive({ textAlign: 'left' }),
        alignCenter: ctx.editor.isActive({ textAlign: 'center' }),
        alignRight: ctx.editor.isActive({ textAlign: 'right' }),
        alignJustify: ctx.editor.isActive({ textAlign: 'justify' }),
        textStyle: activeHeadingLevel ? `heading-${activeHeadingLevel}` : 'paragraph',
        canUndo: ctx.editor.can().undo(),
        canRedo: ctx.editor.can().redo(),
      };
    },
  });

  // El hallazgo real documentado arriba: sincroniza el documento cuando
  // `value` cambia desde AFUERA (IA, cargar otra petición, "Nueva
  // respuesta") — pero nunca mientras el abogado está escribiendo, porque
  // en ese caso `value` ya es exactamente lo que `onUpdate` acaba de
  // reportar (misma referencia de contenido), así que la comparación de
  // abajo no dispara nada y el cursor no se mueve ni salta.
  useEffect(() => {
    if (!editor) return;

    const incoming = value || '';

    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  // Segundo hallazgo real del mismo tipo que el de arriba: el propio
  // `useEditor()` de Tiptap, al re-aplicar opciones en cada render,
  // conserva a propósito el `editable` YA vigente del editor
  // (`this.editor.isEditable`) en vez de tomar el `editable` recién
  // pasado — o sea, cambiar el prop `disabled` DESPUÉS del montaje nunca
  // llegaba a bloquear el editor (solo el valor INICIAL se respetaba).
  // Una petición que pasa a FIRMADO (o mientras la IA está redactando)
  // sin recargar la pantalla se habría quedado editable en la práctica.
  // Solo `editor.setEditable()` llamado a mano lo aplica de verdad.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor || !editorState) return null;

  const setTextStyle = (nextValue: string) => {
    if (nextValue === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }

    const level = Number(nextValue.replace('heading-', '')) as 1 | 2 | 3;
    editor.chain().focus().toggleHeading({ level }).run();
  };

  return (
    <div className="legal-rich-editor rounded-xl border border-slate-200 bg-slate-100">
      <style>{`
        .legal-rich-editor .ProseMirror p {
          text-align: justify;
        }
        .legal-rich-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-t-xl border-b bg-white p-2.5">
        <Select value={editorState.textStyle} onValueChange={setTextStyle} disabled={disabled}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_STYLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarSeparator />

        <ToolbarButton
          label="Negrita"
          shortcut="Ctrl+B"
          active={editorState.isBold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Cursiva"
          shortcut="Ctrl+I"
          active={editorState.isItalic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Subrayado"
          shortcut="Ctrl+U"
          active={editorState.isUnderline}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          label="Alinear a la izquierda"
          active={editorState.alignLeft}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Centrar"
          active={editorState.alignCenter}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Alinear a la derecha"
          active={editorState.alignRight}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Justificar (el documento final siempre justifica el texto)"
          active={editorState.alignJustify}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify size={15} />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          label="Lista con viñetas"
          active={editorState.isBulletList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Lista numerada"
          active={editorState.isOrderedList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Cita / bloque destacado"
          active={editorState.isBlockquote}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          label="Deshacer"
          shortcut="Ctrl+Z"
          disabled={disabled || !editorState.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Rehacer"
          shortcut="Ctrl+Shift+Z"
          disabled={disabled || !editorState.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      <div className="flex justify-center overflow-auto bg-slate-200 p-8">
        <div className="min-h-[1056px] w-[816px] bg-white px-16 py-12 shadow-xl">
          {letterhead}

          <EditorContent
            editor={editor}
            className="prose prose-slate max-w-none font-serif text-[15px] leading-8 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-6 w-px bg-slate-200" />;
}

function ToolbarButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          className={cn(
            'h-8 w-8 p-0',
            active && 'border-primary bg-primary/10 text-primary hover:bg-primary/15',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? <span className="ml-1.5 opacity-60">({shortcut})</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}
