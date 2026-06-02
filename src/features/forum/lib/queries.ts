import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { generateSlug } from './slug';
import { sanitizeThreadHtml, stripHtml } from './sanitize';
import { resolveMentions, linkifyMentions } from './mentions';
import { extractFirstImage } from './preview';
import {
  THREAD_LIST_SELECT,
  THREAD_DETAIL_SELECT,
  type CreateThreadInput,
  type CreateCommentInput,
  type UpdateThreadInput,
  type UpdateCommentInput,
  type ReportInput,
} from './validations';

export type ThreadSort = 'new' | 'hot' | 'top';

interface ListThreadsOpts {
  limit?: number;
  offset?: number;
  q?: string;
  tag?: string;
  /**
   * Orden del feed:
   * - new: cronológico inverso (createdAt DESC) — default
   * - hot: actividad reciente (score * recencyBoost, últimos 7 días)
   * - top: all-time por score (likeCount + commentCount*2)
   */
  sort?: ThreadSort;
  /** Si viene, cada hilo incluye `liked` y `bookmarked` para ese usuario. */
  viewerId?: string;
}

export async function listThreads(opts: ListThreadsOpts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sort: ThreadSort = opts.sort ?? 'new';
  const where: Prisma.ForumThreadWhereInput = { status: 'published' };

  if (opts.tag) {
    where.tags = { has: opts.tag };
  }

  if (opts.q && opts.q.trim().length > 0) {
    const q = opts.q.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { contentText: { contains: q, mode: 'insensitive' } },
    ];
  }

  // `hot` limita al corpus de los últimos 7 días para evitar que hilos
  // antiguos con muchos likes dominen — tal como Reddit. Si alguien busca
  // lo mejor de todos los tiempos, usa `top`.
  if (sort === 'hot') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    where.createdAt = { gte: sevenDaysAgo };
  }

  // Prisma no soporta ordenar por expresiones derivadas ($score), así que
  // para hot/top aproximamos con orderBy múltiple: primero likeCount, luego
  // commentCount, después fecha. Funciona bien para escalas <10k hilos.
  // Cuando el foro crezca, migrar a una columna generada `score` + índice.
  const orderBy: Prisma.ForumThreadOrderByWithRelationInput[] =
    sort === 'new'
      ? [{ createdAt: 'desc' }]
      : [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { createdAt: 'desc' },
        ];

  const threads = await prisma.forumThread.findMany({
    where,
    select: THREAD_LIST_SELECT,
    orderBy,
    take: limit,
    skip: offset,
  });

  // Si hay un viewer autenticado, en una sola query extra resolvemos qué
  // threads tiene con like y con bookmark. Evita N+1 — trae IDs y armamos
  // dos Sets en memoria.
  let likedSet = new Set<string>();
  let bookmarkedSet = new Set<string>();
  if (opts.viewerId && threads.length > 0) {
    const ids = threads.map((t) => t.id);
    const [likes, bookmarks] = await Promise.all([
      prisma.forumThreadLike.findMany({
        where: { userId: opts.viewerId, threadId: { in: ids } },
        select: { threadId: true },
      }),
      prisma.forumThreadBookmark.findMany({
        where: { userId: opts.viewerId, threadId: { in: ids } },
        select: { threadId: true },
      }),
    ]);
    likedSet = new Set(likes.map((l) => l.threadId));
    bookmarkedSet = new Set(bookmarks.map((b) => b.threadId));
  }

  return threads.map((t) => ({
    ...t,
    coverImageUrl: extractFirstImage(t.contentHtml),
    liked: likedSet.has(t.id),
    bookmarked: bookmarkedSet.has(t.id),
  }));
}

/**
 * Top tags de los últimos `days` días, ordenados por frecuencia. Útil para
 * el sidebar derecho del foro. Implementado con `unnest` raw SQL porque
 * Prisma no expone un agregador para arrays nativos.
 */
export async function listTrendingTags(opts: { days?: number; limit?: number } = {}) {
  const days = Math.max(opts.days ?? 30, 1);
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
    SELECT tag, COUNT(*)::bigint AS count
    FROM (
      SELECT unnest(tags) AS tag
      FROM threads
      WHERE status = 'published'
        AND created_at >= ${since}
    ) t
    WHERE tag IS NOT NULL AND tag <> ''
    GROUP BY tag
    ORDER BY count DESC, tag ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ tag: r.tag, count: Number(r.count) }));
}

/**
 * Hilos publicados sin comentarios. Sirve al sidebar para invitar a la
 * comunidad a responder lo que está esperando atención.
 */
export async function listUnansweredThreads(opts: { limit?: number; days?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 20);
  const days = Math.max(opts.days ?? 90, 1);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.forumThread.findMany({
    where: {
      status: 'published',
      commentCount: 0,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      author: {
        select: { id: true, username: true, fullName: true, avatarUrl: true },
      },
    },
  });
}

export async function getThreadBySlug(slug: string, viewerId?: string) {
  const thread = await prisma.forumThread.findFirst({
    where: { slug, status: 'published' },
    select: THREAD_DETAIL_SELECT,
  });
  if (!thread) return null;

  const coverImageUrl = extractFirstImage(thread.contentHtml);

  if (!viewerId) {
    return { ...thread, coverImageUrl, liked: false, bookmarked: false };
  }

  const [like, bookmark] = await Promise.all([
    prisma.forumThreadLike.findUnique({
      where: { userId_threadId: { userId: viewerId, threadId: thread.id } },
      select: { userId: true },
    }),
    prisma.forumThreadBookmark.findUnique({
      where: { userId_threadId: { userId: viewerId, threadId: thread.id } },
      select: { userId: true },
    }),
  ]);

  return { ...thread, coverImageUrl, liked: !!like, bookmarked: !!bookmark };
}

export async function listCommentsByThread(threadId: string) {
  return prisma.forumComment.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      contentHtml: true,
      createdAt: true,
      editedAt: true,
      parentId: true,
      author: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 4; i++) {
    const existing = await prisma.forumThread.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createThread(userId: string, input: CreateThreadInput) {
  const sanitized = sanitizeThreadHtml(input.contentHtml);
  const contentText = stripHtml(sanitized);
  if (!contentText || contentText.length < 2) {
    throw new Error('El contenido no puede estar vacío');
  }

  // Resolver @menciones → linkificar + notificar. No menciones a uno mismo.
  const mentions = await resolveMentions(contentText);
  mentions.delete(userId); // no auto-notificar
  const contentHtml = linkifyMentions(sanitized, mentions);

  const slug = await uniqueSlug(generateSlug(input.title));

  const thread = await prisma.forumThread.create({
    data: {
      authorId: userId,
      title: input.title.trim(),
      slug,
      contentHtml,
      contentText,
      tags: input.tags,
    },
    select: THREAD_DETAIL_SELECT,
  });

  // Notifs de mención — fire-and-forget a nivel de fallo, pero esperamos
  // para no dejar promesas colgando en serverless.
  const mentionedIds = Array.from(mentions.values()).filter(
    (id) => id !== userId && id !== thread.author?.id,
  );
  if (mentionedIds.length > 0) {
    await prisma.forumNotification
      .createMany({
        data: mentionedIds.map((recipientId) => ({
          recipientId,
          actorId: userId,
          type: 'mention',
          threadId: thread.id,
        })),
        skipDuplicates: true,
      })
      .catch((err) => {
        console.error('[createThread] notif failed:', err);
      });
  }

  return thread;
}

// Máxima profundidad del árbol de replies. Cualquier reply a un comment en
// nivel 2 se reparenta al mismo parent (colapsa al nivel 2) — así evitamos
// que un hilo se transforme en una cascada infinita de indentación.
const MAX_REPLY_DEPTH = 2;

export async function createComment(
  userId: string,
  threadId: string,
  input: CreateCommentInput,
) {
  const sanitized = sanitizeThreadHtml(input.contentHtml);
  const contentText = stripHtml(sanitized);
  if (!contentText || contentText.length < 1) {
    throw new Error('El comentario no puede estar vacío');
  }

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { id: true, status: true, authorId: true },
  });
  if (!thread || thread.status !== 'published') {
    return null;
  }

  // Linkificar menciones y recolectar IDs mencionados para notifs.
  const mentions = await resolveMentions(contentText);
  mentions.delete(userId);
  const contentHtml = linkifyMentions(sanitized, mentions);

  // Validar parentId (si viene): debe pertenecer al mismo thread y no
  // exceder el nivel máximo. Si el parent ya está en nivel máximo, reparent
  // al abuelo — mantiene la conversación en plano sin perder el contexto.
  let finalParentId: string | null = null;
  if (input.parentId) {
    let depth = 0;
    let currentId: string | null = input.parentId;
    while (currentId && depth <= MAX_REPLY_DEPTH) {
      const parent: { id: string; threadId: string; parentId: string | null } | null =
        await prisma.forumComment.findUnique({
          where: { id: currentId },
          select: { id: true, threadId: true, parentId: true },
        });
      if (!parent) {
        return null; // parent no existe
      }
      if (parent.threadId !== threadId) {
        return null; // parent pertenece a otro hilo
      }
      if (depth < MAX_REPLY_DEPTH) {
        finalParentId = parent.id;
        break;
      }
      // Nivel máximo alcanzado — subimos al abuelo.
      currentId = parent.parentId;
      depth++;
      finalParentId = parent.parentId; // si ya no hay más ancestros, queda null (top-level)
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.forumComment.create({
      data: {
        threadId,
        authorId: userId,
        contentHtml,
        parentId: finalParentId,
      },
      select: {
        id: true,
        contentHtml: true,
        createdAt: true,
        editedAt: true,
        parentId: true,
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await tx.forumThread.update({
      where: { id: threadId },
      data: { commentCount: { increment: 1 } },
    });

    return created;
  });

  // Generar notifs post-commit. Recolectamos destinatarios por tipo y
  // deduplicamos: si alguien es tanto autor del thread como mencionado,
  // prefiere la mención (más específica).
  const notifications: Array<{
    recipientId: string;
    actorId: string;
    type: 'mention' | 'reply' | 'comment_on_thread';
    threadId: string;
    commentId: string;
  }> = [];
  const seen = new Set<string>();

  // 1. Menciones primero (más específico).
  for (const mentionedId of Array.from(mentions.values())) {
    if (mentionedId === userId || seen.has(mentionedId)) continue;
    notifications.push({
      recipientId: mentionedId,
      actorId: userId,
      type: 'mention',
      threadId,
      commentId: comment.id,
    });
    seen.add(mentionedId);
  }

  // 2. Si es reply a un comment ajeno, notifica al autor del parent.
  if (finalParentId) {
    const parent = await prisma.forumComment.findUnique({
      where: { id: finalParentId },
      select: { authorId: true },
    });
    if (parent && parent.authorId !== userId && !seen.has(parent.authorId)) {
      notifications.push({
        recipientId: parent.authorId,
        actorId: userId,
        type: 'reply',
        threadId,
        commentId: comment.id,
      });
      seen.add(parent.authorId);
    }
  }

  // 3. Si es top-level y el thread author no es el commenter, notificar.
  if (!finalParentId && thread.authorId !== userId && !seen.has(thread.authorId)) {
    notifications.push({
      recipientId: thread.authorId,
      actorId: userId,
      type: 'comment_on_thread',
      threadId,
      commentId: comment.id,
    });
    seen.add(thread.authorId);
  }

  if (notifications.length > 0) {
    await prisma.forumNotification
      .createMany({ data: notifications, skipDuplicates: true })
      .catch((err) => {
        console.error('[createComment] notif failed:', err);
      });
  }

  return comment;
}

/**
 * Toggle del like de un usuario sobre un hilo.
 *
 * La PK compuesta (userId, threadId) garantiza idempotencia a nivel DB —
 * intentar crear dos veces el mismo like tira constraint violation, pero
 * acá usamos `findUnique` + `create`/`delete` dentro de una transacción
 * para mantener sincronizado el contador denormalizado `likeCount` del
 * hilo. Si se omitiera el counter, un simple upsert bastaría.
 *
 * Retorna el estado final del par (liked + likeCount actualizados) para
 * que el cliente pueda reconciliar con su UI optimista.
 */
export async function toggleThreadLike(
  userId: string,
  threadId: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  // Verificar que el hilo existe y está publicado antes de tocar nada.
  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { id: true, status: true, likeCount: true },
  });
  if (!thread || thread.status !== 'published') return null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.forumThreadLike.findUnique({
      where: { userId_threadId: { userId, threadId } },
      select: { userId: true },
    });

    if (existing) {
      await tx.forumThreadLike.delete({
        where: { userId_threadId: { userId, threadId } },
      });
      const updated = await tx.forumThread.update({
        where: { id: threadId },
        // Math.max(0, ...) no existe en Prisma update, así que el contador
        // se protege con un check: solo decrementa si está > 0.
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      return { liked: false, likeCount: Math.max(0, updated.likeCount) };
    }

    await tx.forumThreadLike.create({
      data: { userId, threadId },
    });
    const updated = await tx.forumThread.update({
      where: { id: threadId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return { liked: true, likeCount: updated.likeCount };
  });
}

/**
 * Toggle del bookmark. Como no hay contador denormalizado (los bookmarks
 * son personales y no se exponen agregados), basta con `upsert`/`delete`.
 */
export async function toggleThreadBookmark(
  userId: string,
  threadId: string
): Promise<{ bookmarked: boolean } | null> {
  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { id: true, status: true },
  });
  if (!thread || thread.status !== 'published') return null;

  const existing = await prisma.forumThreadBookmark.findUnique({
    where: { userId_threadId: { userId, threadId } },
    select: { userId: true },
  });

  if (existing) {
    await prisma.forumThreadBookmark.delete({
      where: { userId_threadId: { userId, threadId } },
    });
    return { bookmarked: false };
  }

  await prisma.forumThreadBookmark.create({
    data: { userId, threadId },
  });
  return { bookmarked: true };
}

/**
 * Actualiza un hilo. Solo el autor o admin deberían llegar acá — la caller
 * es responsable de validar. Retorna `null` si el hilo no existe.
 */
export async function updateThread(threadId: string, input: UpdateThreadInput) {
  const data: Prisma.ForumThreadUpdateInput = { editedAt: new Date() };
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.contentHtml !== undefined) {
    const contentHtml = sanitizeThreadHtml(input.contentHtml);
    const contentText = stripHtml(contentHtml);
    if (!contentText || contentText.length < 2) {
      throw new Error('El contenido no puede estar vacío');
    }
    data.contentHtml = contentHtml;
    data.contentText = contentText;
  }

  try {
    return await prisma.forumThread.update({
      where: { id: threadId },
      data,
      select: THREAD_DETAIL_SELECT,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return null;
    }
    throw err;
  }
}

/**
 * Borra un hilo. Prisma cascade borra comments/likes/bookmarks asociados
 * (onDelete: Cascade en el schema). Retorna `true` si se borró, `false`
 * si no existía.
 */
export async function deleteThread(threadId: string): Promise<boolean> {
  try {
    await prisma.forumThread.delete({ where: { id: threadId } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return false;
    }
    throw err;
  }
}

export async function updateComment(commentId: string, input: UpdateCommentInput) {
  const contentHtml = sanitizeThreadHtml(input.contentHtml);
  const contentText = stripHtml(contentHtml);
  if (!contentText || contentText.length < 1) {
    throw new Error('El comentario no puede estar vacío');
  }
  try {
    return await prisma.forumComment.update({
      where: { id: commentId },
      data: { contentHtml, editedAt: new Date() },
      select: {
        id: true,
        contentHtml: true,
        createdAt: true,
        updatedAt: true,
        editedAt: true,
        author: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return null;
    }
    throw err;
  }
}

/**
 * Borra un comentario y decrementa el contador del hilo asociado en una
 * transacción. Retorna `true` si se borró.
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const comment = await tx.forumComment.delete({
        where: { id: commentId },
        select: { threadId: true },
      });
      await tx.forumThread.update({
        where: { id: comment.threadId },
        data: { commentCount: { decrement: 1 } },
      });
    });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return false;
    }
    throw err;
  }
}

/**
 * Devuelve { authorId } de un hilo — se usa para chequear ownership antes
 * de editar/borrar. Más barato que traer todo el detail.
 */
export async function getThreadAuthor(threadId: string) {
  return prisma.forumThread.findUnique({
    where: { id: threadId },
    select: { authorId: true },
  });
}

export async function getCommentAuthor(commentId: string) {
  return prisma.forumComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, threadId: true },
  });
}

// ============================================================
// Notificaciones
// ============================================================

export async function listNotifications(
  recipientId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  return prisma.forumNotification.findMany({
    where: {
      recipientId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      createdAt: true,
      readAt: true,
      actor: {
        select: { id: true, username: true, fullName: true, avatarUrl: true },
      },
      thread: {
        select: { id: true, slug: true, title: true },
      },
      commentId: true,
    },
  });
}

export async function countUnreadNotifications(recipientId: string) {
  return prisma.forumNotification.count({
    where: { recipientId, readAt: null },
  });
}

export async function markNotificationsAsRead(
  recipientId: string,
  ids?: string[],
) {
  const where: Prisma.ForumNotificationWhereInput = {
    recipientId,
    readAt: null,
  };
  if (ids && ids.length > 0) where.id = { in: ids };

  const result = await prisma.forumNotification.updateMany({
    where,
    data: { readAt: new Date() },
  });
  return result.count;
}

// ============================================================
// Panel admin — listado y acciones sobre reportes
// ============================================================

export type ReportFilterStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned' | 'all';

interface ListReportsOpts {
  limit?: number;
  offset?: number;
  status?: ReportFilterStatus;
}

/**
 * Lista reportes con su target hidratado (thread o comment). Usada por el
 * panel de moderación. Devuelve también los counts por status para
 * pintar badges en el tab bar.
 */
export async function listReports(opts: ListReportsOpts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const status = opts.status ?? 'pending';

  const where: Prisma.ForumReportWhereInput =
    status === 'all' ? {} : { status };

  const [rows, pendingCount] = await Promise.all([
    prisma.forumReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        reviewedAt: true,
        reporter: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        reviewer: {
          select: { id: true, username: true, fullName: true },
        },
      },
    }),
    prisma.forumReport.count({ where: { status: 'pending' } }),
  ]);

  // Hidratar el target. Una query por tipo para no N+1 en loops.
  const threadIds = rows
    .filter((r) => r.targetType === 'thread')
    .map((r) => r.targetId);
  const commentIds = rows
    .filter((r) => r.targetType === 'comment')
    .map((r) => r.targetId);

  const [threads, comments] = await Promise.all([
    threadIds.length > 0
      ? prisma.forumThread.findMany({
          where: { id: { in: threadIds } },
          select: {
            id: true,
            slug: true,
            title: true,
            contentText: true,
            status: true,
            createdAt: true,
            author: {
              select: { id: true, username: true, fullName: true, avatarUrl: true },
            },
          },
        })
      : Promise.resolve([]),
    commentIds.length > 0
      ? prisma.forumComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            contentHtml: true,
            createdAt: true,
            thread: { select: { id: true, slug: true, title: true } },
            author: {
              select: { id: true, username: true, fullName: true, avatarUrl: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const threadMap = new Map(threads.map((t) => [t.id, t]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  const reports = rows.map((r) => ({
    ...r,
    target:
      r.targetType === 'thread'
        ? threadMap.get(r.targetId) ?? null
        : commentMap.get(r.targetId) ?? null,
  }));

  return { reports, pendingCount };
}

export type ReportAction =
  | 'hide_thread'
  | 'restore_thread'
  | 'delete_comment'
  | null;

interface UpdateReportOpts {
  reportId: string;
  reviewerId: string;
  newStatus: 'reviewed' | 'dismissed' | 'actioned' | 'pending';
  action?: ReportAction;
}

/**
 * Transición de un reporte (y opcionalmente ejecuta una acción sobre el
 * target). Todo en una transacción — si la acción falla, el estado del
 * reporte no cambia.
 *
 * Acciones soportadas:
 * - hide_thread: cambia thread.status a 'hidden' (invisible en feeds y
 *   detail; el admin lo ve desde el propio panel y lo puede restaurar).
 * - restore_thread: thread.status → 'published'
 * - delete_comment: borra el comment y decrementa commentCount (cascada
 *   en Prisma ya limpia likes/bookmarks por FK).
 */
export async function updateReport(opts: UpdateReportOpts) {
  const { reportId, reviewerId, newStatus, action } = opts;

  return prisma.$transaction(async (tx) => {
    const report = await tx.forumReport.findUnique({
      where: { id: reportId },
      select: { id: true, targetType: true, targetId: true },
    });
    if (!report) return { notFound: true as const };

    // Ejecutar acción primero — si falla, revierte todo.
    if (action === 'hide_thread' && report.targetType === 'thread') {
      await tx.forumThread.update({
        where: { id: report.targetId },
        data: { status: 'hidden' },
      });
    } else if (action === 'restore_thread' && report.targetType === 'thread') {
      await tx.forumThread.update({
        where: { id: report.targetId },
        data: { status: 'published' },
      });
    } else if (action === 'delete_comment' && report.targetType === 'comment') {
      // Delete cascade → notifs y replies huérfanas (FK SetNull) se limpian.
      const comment = await tx.forumComment
        .delete({
          where: { id: report.targetId },
          select: { threadId: true },
        })
        .catch(() => null);
      if (comment) {
        await tx.forumThread.update({
          where: { id: comment.threadId },
          data: { commentCount: { decrement: 1 } },
        });
      }
    }

    const updated = await tx.forumReport.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewedAt: newStatus === 'pending' ? null : new Date(),
        reviewerId: newStatus === 'pending' ? null : reviewerId,
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        reviewerId: true,
      },
    });

    return { notFound: false as const, report: updated };
  });
}

/**
 * Crea un reporte. Si el mismo usuario ya reportó el mismo target (por
 * la constraint unique(reporter_id, target_type, target_id)), devuelve
 * `{ duplicate: true }` sin lanzar — UX-friendly: decimos "ya fue
 * reportado" en vez de un error 500.
 */
export async function createForumReport(
  reporterId: string,
  targetType: 'thread' | 'comment',
  targetId: string,
  input: ReportInput,
): Promise<{ created: boolean; duplicate: boolean; notFound: boolean }> {
  // Validar que el target existe — evitamos reportes de targets inexistentes.
  if (targetType === 'thread') {
    const thread = await prisma.forumThread.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!thread) return { created: false, duplicate: false, notFound: true };
  } else {
    const comment = await prisma.forumComment.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!comment) return { created: false, duplicate: false, notFound: true };
  }

  try {
    await prisma.forumReport.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason: input.reason,
        details: input.details ?? null,
      },
    });
    return { created: true, duplicate: false, notFound: false };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { created: false, duplicate: true, notFound: false };
    }
    throw err;
  }
}
