/**
 * Capa de acceso a datos para el feature `posts`.
 * Todos los handlers en `app/api/posts/*` deben delegar aquí en vez de
 * llamar a `prisma.post` directamente.
 */

import { randomUUID } from 'crypto';
import { prisma } from '@/shared/lib/prisma';
import { generateSlug, estimateReadTime } from './slug';
import {
  POST_LIST_SELECT,
  POST_DETAIL_SELECT,
  type CreatePostInput,
  type UpdatePostInput,
} from './validations';

export async function listPostsByUser(
  userId: string,
  opts: { published?: boolean } = {}
) {
  return prisma.post.findMany({
    where: {
      userId,
      ...(opts.published !== undefined && { published: opts.published }),
    },
    select: POST_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPostByIdForUser(id: string, userId: string) {
  return prisma.post.findFirst({
    where: { id, userId },
    select: POST_DETAIL_SELECT,
  });
}

export async function createPostForUser(userId: string, input: CreatePostInput) {
  let slug = generateSlug(input.title);
  const existing = await prisma.post.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;
  const readTime = estimateReadTime(input.content);
  const now = new Date();

  return prisma.post.create({
    data: {
      id: randomUUID(),
      userId,
      title: input.title,
      slug,
      content: input.content,
      excerpt: input.excerpt ?? input.content.substring(0, 160) + '...',
      coverImageUrl: input.coverImageUrl ?? null,
      published: input.published,
      publishedAt: input.published ? now : null,
      tags: input.tags,
      readTime,
      createdAt: now,
      updatedAt: now,
    },
    select: POST_LIST_SELECT,
  });
}

export async function updatePostForUser(
  id: string,
  userId: string,
  input: UpdatePostInput
) {
  const existing = await prisma.post.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) {
    data.content = input.content;
    data.readTime = estimateReadTime(input.content);
  }
  if (input.excerpt !== undefined) data.excerpt = input.excerpt;
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.published !== undefined) {
    data.published = input.published;
    if (input.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  return prisma.post.update({
    where: { id },
    data,
    select: POST_LIST_SELECT,
  });
}

export async function deletePostForUser(id: string, userId: string) {
  const existing = await prisma.post.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.post.delete({ where: { id } });
  return true;
}

export async function updatePostAsAdmin(id: string, input: UpdatePostInput) {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) {
    data.content = input.content;
    data.readTime = estimateReadTime(input.content);
  }
  if (input.excerpt !== undefined) data.excerpt = input.excerpt;
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.published !== undefined) {
    data.published = input.published;
    if (input.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  return prisma.post.update({
    where: { id },
    data,
    select: POST_LIST_SELECT,
  });
}

export async function deletePostAsAdmin(id: string) {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.post.delete({ where: { id } });
  return true;
}
