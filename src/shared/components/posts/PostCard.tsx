import Link from 'next/link';
import Image from 'next/image';

export interface PostCardData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  tags: string[];
  readTime: number | null;
  author: {
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function PostCard({ post }: { post: PostCardData }) {
  const authorName = post.author.fullName ?? post.author.username ?? 'Anónimo';
  const authorHref = post.author.username ? `/${post.author.username}` : '#';
  const postHref = `/blog/${post.slug}`;
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <article className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2 mb-3">
        {post.author.avatarUrl ? (
          <Image
            src={post.author.avatarUrl}
            alt={authorName}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {authorName[0]?.toUpperCase()}
          </div>
        )}
        <Link
          href={authorHref}
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {authorName}
        </Link>
        {date && <span className="text-sm text-gray-400">· {date}</span>}
        {post.readTime && (
          <span className="text-sm text-gray-400">· {post.readTime} min</span>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <Link href={postHref}>
            <h2 className="text-lg font-bold text-gray-900 hover:text-primary transition-colors leading-snug mb-1">
              {post.title}
            </h2>
          </Link>
          {post.excerpt && (
            <p className="text-gray-500 text-sm line-clamp-2">{post.excerpt}</p>
          )}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {post.coverImageUrl && (
          <div className="shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden">
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </article>
  );
}
