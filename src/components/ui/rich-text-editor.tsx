'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from "@/components/ui/button";
import { 
  Bold, Italic, List, Heading1, Braces 
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// 1. DEFINIMOS LAS VARIABLES AQUÍ
const AVAILABLE_VARIABLES = [
    { label: 'Nombre del Contacto', value: 'nombre', icon: '👤' },
    { label: 'Cargo / Puesto', value: 'cargo', icon: '💼' },
    { label: 'Entidad / Empresa', value: 'empresa', icon: '🏢' },
    { label: 'Fecha Actual', value: 'fecha', icon: '📅' }
];

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    // --- CORRECCIÓN AQUÍ ---
    immediatelyRender: false, // Esto soluciona el error de SSR/Hidratación
    // -----------------------
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none text-slate-700',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const insertVariable = (variable: string) => {
    editor.chain().focus().insertContent(` {{${variable}}} `).run();
  };

  const ToolbarButton = ({ onClick, active, icon: Icon, title }: any) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-8 w-8 p-0 ${active ? 'bg-slate-200 text-[#1B2541]' : 'text-slate-500 hover:text-[#1B2541]'}`}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#FFC400]/50 transition-all">
      {/* TOOLBAR */}
      <div className="bg-slate-50 border-b border-slate-200 p-1 flex flex-wrap gap-1 items-center">
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive('bold')} 
          icon={Bold} title="Negrita" 
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive('italic')} 
          icon={Italic} title="Cursiva" 
        />
        
        <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          active={editor.isActive('heading', { level: 2 })} 
          icon={Heading1} title="Título" 
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          active={editor.isActive('bulletList')} 
          icon={List} title="Lista" 
        />

        <div className="ml-auto">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-2 border-slate-300 text-[#1B2541]">
                        <Braces className="h-3 w-3" /> Variables
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {AVAILABLE_VARIABLES.map((v) => (
                        <DropdownMenuItem key={v.value} onClick={() => insertVariable(v.value)}>
                            <span className="mr-2">{v.icon}</span> {v.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* EDITOR AREA */}
      <EditorContent editor={editor} />
    </div>
  );
}