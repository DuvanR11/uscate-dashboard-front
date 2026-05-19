'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, UnderlineIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Heading1,
} from 'lucide-react';

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
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex flex-wrap gap-2 border-b bg-white p-3">
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </Button>

        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </Button>

        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </Button>

        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={15} />
        </Button>

        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={15} />
        </Button>

        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={15} />
        </Button>

        <Button
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
        <Heading1 size={15} />
        </Button>

        <Button
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
        <List size={15} />
        </Button>

        <Button
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
        <ListOrdered size={15} />
        </Button>

        <Button
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
        <Quote size={15} />
        </Button>

        <Button
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().undo().run()}
        >
        <Undo2 size={15} />
        </Button>

        <Button
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().redo().run()}
        >
        <Redo2 size={15} />
        </Button>
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