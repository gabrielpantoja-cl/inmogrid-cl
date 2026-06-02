'use client';

import Link from 'next/link';
import { lusitana } from '@/shared/lib/styles/fonts';
import { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  published: boolean;
  publishedAt: Date | null;
  tags: string[];
  readTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BlogContentProps {
  initialPosts: Post[];
}

const ITEMS_PER_PAGE = 8;

export default function BlogContent({
  initialPosts,
}: BlogContentProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = posts.filter((post) => {
    if (filter === 'published') return post.published;
    if (filter === 'draft') return !post.published;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = filteredPosts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      setPosts(posts.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error al eliminar la publicación');
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          published: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar');
      }

      const { post } = await response.json();

      setPosts(
        posts.map((p) =>
          p.id === id
            ? {
                ...p,
                published: post.published,
                publishedAt: post.publishedAt,
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Error al cambiar el estado de publicación');
    }
  };

  return (
    <main className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`${lusitana.className} text-2xl md:text-3xl text-gray-800`}>
            Gestión del Blog
          </h1>
          <p className="text-gray-600 mt-1">
            Administra todas las publicaciones del blog
          </p>
        </div>
        <Link
          href="/admin/blog/nuevo"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Nueva Publicación
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => { setFilter('all'); setCurrentPage(1); }}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'all'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Todas ({posts.length})
        </button>
        <button
          onClick={() => { setFilter('published'); setCurrentPage(1); }}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'published'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Publicadas ({posts.filter((p) => p.published).length})
        </button>
        <button
          onClick={() => { setFilter('draft'); setCurrentPage(1); }}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'draft'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Borradores ({posts.filter((p) => !p.published).length})
        </button>
      </div>

      {/* Lista de Posts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">
              No hay publicaciones aún
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Crea la primera publicación del blog
            </p>
            <Link
              href="/admin/blog/nuevo"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Crear Primera Publicación
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedPosts.map((post) => (
              <div
                key={post.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 truncate">
                        {post.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          post.published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {post.published ? 'Publicada' : 'Borrador'}
                      </span>
                    </div>

                    {post.excerpt && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>
                        Creada{' '}
                        {formatDistanceToNowStrict(new Date(post.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                      {post.readTime && (
                        <span>{post.readTime} min de lectura</span>
                      )}
                      {post.tags.length > 0 && (
                        <div className="flex gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {post.published && (
                      <Link
                        href={`/blog/${post.slug}`}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Ver publicación"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>
                    )}

                    <Link
                      href={`/admin/blog/${post.id}/editar`}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </Link>

                    <button
                      onClick={() => handleTogglePublish(post.id, post.published)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        post.published
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title={post.published ? 'Despublicar' : 'Publicar'}
                    >
                      {post.published ? 'Despublicar' : 'Publicar'}
                    </button>

                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Página {safePage} de {totalPages} ({filteredPosts.length} publicaciones)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
