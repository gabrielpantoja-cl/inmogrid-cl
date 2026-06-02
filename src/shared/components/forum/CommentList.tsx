import { CommentItem } from './CommentItem';
import type { ForumComment } from './types';

interface Props {
  threadId: string;
  comments: ForumComment[];
}

/**
 * Agrupa los comentarios por parentId (null = top-level) y arma el árbol.
 * Los comments vienen ordenados ASC por createdAt, así que el primer nivel y
 * cada rama conservan orden cronológico.
 */
function buildTree(comments: ForumComment[]): Map<string | null, ForumComment[]> {
  const byParent = new Map<string | null, ForumComment[]>();
  for (const c of comments) {
    const key = c.parentId ?? null;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(c);
    else byParent.set(key, [c]);
  }
  return byParent;
}

export function CommentList({ threadId, comments }: Props) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Aún no hay comentarios. Sé el primero en responder.
      </p>
    );
  }

  const tree = buildTree(comments);
  const topLevel = tree.get(null) ?? [];

  return (
    <ul className="space-y-4">
      {topLevel.map((comment) => (
        <CommentItem
          key={comment.id}
          threadId={threadId}
          comment={comment}
          tree={tree}
          depth={0}
        />
      ))}
    </ul>
  );
}
