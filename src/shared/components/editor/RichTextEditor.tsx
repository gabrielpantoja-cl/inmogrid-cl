'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  LinkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/shared/hooks/useAuth';
import { useImageUpload } from '@/shared/hooks/useImageUpload';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí…',
  minHeight = 180,
  disabled = false,
}: RichTextEditorProps) {
  const { user } = useAuth();
  const userId = user?.id;

  // Hook de upload — solo se usa si hay userId. El bucket "forum-images"
  // sirve para hilos y comentarios; si más adelante diferenciamos por
  // contexto, se puede pasar `bucket`/`folder` como prop al editor.
  const { upload, uploading, error: uploadError, clearError } = useImageUpload({
    bucket: 'forum-images',
    userId: userId ?? '',
    folder: 'content',
  });

  const [imageError, setImageError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener nofollow',
          target: '_blank',
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
          loading: 'lazy',
        },
      }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none px-4 py-3 text-gray-900 prose-p:my-5',
        'aria-label': placeholder,
        spellcheck: 'true',
        lang: 'es',
      },
      // handlePaste y handleDrop reciben los eventos antes que ProseMirror
      // los procese — si retornamos true, el evento se considera consumido
      // y el flujo default no corre. Ahí es donde interceptamos imágenes.
      handlePaste: (_view, event) => {
        return handleImageEvent(event.clipboardData, event);
      },
      handleDrop: (_view, event) => {
        const dataTransfer = (event as DragEvent).dataTransfer;
        return handleImageEvent(dataTransfer, event);
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  /**
   * Si el evento contiene archivos de imagen, los sube uno por uno y los
   * inserta en el editor. Retorna `true` si hubo imágenes (consumido) o
   * `false` para que ProseMirror maneje el resto (texto, otros archivos).
   */
  const handleImageEvent = (
    dataTransfer: DataTransfer | null,
    domEvent: Event
  ): boolean => {
    if (!dataTransfer || !userId) return false;

    const imageFiles = Array.from(dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (imageFiles.length === 0) return false;

    domEvent.preventDefault();

    // Disparar uploads en paralelo. Tiptap permite múltiples setImage
    // consecutivos — los inserta en el orden en que llegan.
    imageFiles.forEach(async (file) => {
      clearError();
      setImageError(null);
      const result = await upload(file);
      if (result && editor) {
        editor.chain().focus().setImage({ src: result.publicUrl }).run();
      }
    });

    return true;
  };

  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      // External reset (e.g., after submit). Silent set, no update event.
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-gray-200 bg-gray-50 animate-pulse"
        style={{ minHeight: minHeight + 40 }}
      />
    );
  }

  return (
    <div className="rounded-xl border border-gray-300 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-colors">
      <Toolbar
        editor={editor}
        canUpload={Boolean(userId)}
        uploading={uploading}
        onUploadFile={async (file) => {
          clearError();
          setImageError(null);
          const result = await upload(file);
          if (result) {
            editor.chain().focus().setImage({ src: result.publicUrl }).run();
          }
        }}
        onUploadError={setImageError}
      />
      <div style={{ minHeight }} className="relative">
        {editor.isEmpty && (
          <span className="pointer-events-none absolute left-4 top-3 text-gray-400 text-sm select-none">
            {placeholder}
          </span>
        )}
        {uploading && (
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full bg-gray-900/80 px-3 py-1 text-xs text-white">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            Subiendo imagen…
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      {(imageError || uploadError) && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {imageError || uploadError}
        </div>
      )}
    </div>
  );
}

interface ToolbarProps {
  editor: Editor;
  canUpload: boolean;
  uploading: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onUploadError: (msg: string | null) => void;
}

function Toolbar({ editor, canUpload, uploading, onUploadFile, onUploadError }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buttonClass = (active: boolean) =>
    `inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors ${
      active
        ? 'bg-gray-200 text-gray-900'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const addLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del enlace (https://…):', prev ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('/')) {
      normalized = `https://${normalized}`;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  /**
   * Fallback de imagen por URL. Solo se usa si el usuario no está
   * autenticado (raro en el foro hoy) o si decide pegar una URL en vez
   * de subir un archivo. El path principal es el botón de upload.
   */
  const addImageByUrl = () => {
    const url = window.prompt('URL de la imagen (https://…):', 'https://');
    if (!url) return;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      window.alert('La URL debe empezar con https://');
      return;
    }
    editor.chain().focus().setImage({ src: trimmed }).run();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadError(null);
    await onUploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-2 py-1.5">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        aria-label="Negrita"
        title="Negrita (Ctrl+B)"
      >
        <BoldIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        aria-label="Itálica"
        title="Itálica (Ctrl+I)"
      >
        <ItalicIcon className="w-4 h-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        aria-label="Lista con viñetas"
        title="Lista"
      >
        <ListBulletIcon className="w-4 h-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
      <button
        type="button"
        onClick={addLink}
        className={buttonClass(editor.isActive('link'))}
        aria-label="Insertar enlace"
        title="Enlace"
      >
        <LinkIcon className="w-4 h-4" />
      </button>

      {canUpload ? (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`${buttonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Subir imagen"
            title="Subir imagen (también podés arrastrarla o pegarla)"
          >
            <PhotoIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={handleFileSelect}
            className="sr-only"
            aria-label="Subir imagen"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={addImageByUrl}
          className={buttonClass(false)}
          aria-label="Insertar imagen"
          title="Imagen (URL)"
        >
          <PhotoIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
