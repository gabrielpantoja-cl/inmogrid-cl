export interface ThreadAuthor {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ThreadListItem {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  commentCount: number;
  likeCount: number;
  /** true si el viewer autenticado dio like al hilo */
  liked: boolean;
  /** true si el viewer autenticado guardó el hilo */
  bookmarked: boolean;
  createdAt: string;
  updatedAt: string;
  /** Timestamp de edición manual del autor. null si no fue editado. */
  editedAt: string | null;
  /** Texto plano truncado — mostrado colapsado con line-clamp */
  preview: string;
  /**
   * URL de la primera imagen embebida en el contenido del hilo, extraída
   * server-side del HTML sanitizado. `null` si el hilo no contiene
   * imágenes — la card omite el bloque visual en ese caso (no placeholder).
   */
  coverImageUrl: string | null;
  /**
   * HTML sanitizado. Opcional — en el listado NO viene (payload optimization);
   * se carga on-demand via GET /api/public/threads/[slug] cuando el usuario
   * expande el hilo. Viene pre-poblado cuando el feed se embebe dentro de la
   * página de detalle o en otros contextos SSR con detail select.
   */
  contentHtml?: string;
  author: ThreadAuthor;
}

export interface ThreadDetailData
  extends Omit<ThreadListItem, 'preview' | 'contentHtml' | 'coverImageUrl'> {
  contentHtml: string;
}

export interface ForumComment {
  id: string;
  contentHtml: string;
  createdAt: string;
  editedAt: string | null;
  /** null = top-level; si no, ID del comment al que responde. */
  parentId: string | null;
  author: ThreadAuthor;
}
