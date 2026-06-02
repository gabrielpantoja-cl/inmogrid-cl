'use server'

/**
 * ========================================
 * INMOGRID.CL - SERVER ACTIONS (NETWORKING)
 * ========================================
 * Next.js 15 + React 19 Server Actions
 * Implementación moderna sin API routes tradicionales
 * ========================================
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/shared/lib/prisma'
import { getUser } from '@/shared/lib/supabase/auth'

const ConnectionRequestSchema = z.object({
  receiverId: z.string().min(1, 'Usuario requerido'),
  message: z.string().optional(),
})

const ConnectionActionSchema = z.object({
  connectionId: z.string().min(1, 'Conexión requerida'),
  action: z.enum(['accept', 'reject', 'block']),
})

type ActionResponse<T = void> = {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Helper: Supabase user.id = profile.id (UUID)
async function getAuthenticatedUser() {
  const supabaseUser = await getUser()

  if (!supabaseUser?.id) {
    throw new Error('No autenticado')
  }

  const profile = await prisma.profile.findUnique({
    where: { id: supabaseUser.id },
    select: { id: true, fullName: true }
  })

  if (!profile) {
    throw new Error('Perfil no encontrado')
  }

  return profile
}

// ========================================
// SERVER ACTION: Enviar solicitud de conexión
// ========================================

export async function sendConnectionRequest(
  formData: FormData
): Promise<ActionResponse<{ connectionId: string }>> {
  try {
    const currentUser = await getAuthenticatedUser()

    const validatedData = ConnectionRequestSchema.parse({
      receiverId: formData.get('receiverId'),
      message: formData.get('message'),
    })

    if (validatedData.receiverId === currentUser.id) {
      return { success: false, error: 'No puedes enviarte una solicitud a ti mismo' }
    }

    const receiver = await prisma.profile.findUnique({
      where: { id: validatedData.receiverId },
      select: { id: true, fullName: true }
    })

    if (!receiver) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, receiverId: validatedData.receiverId },
          { requesterId: validatedData.receiverId, receiverId: currentUser.id },
        ],
      },
    })

    if (existingConnection) {
      return { success: false, error: 'Ya existe una conexión con este usuario' }
    }

    const connection = await prisma.connection.create({
      data: {
        id: crypto.randomUUID(),
        requesterId: currentUser.id,
        receiverId: validatedData.receiverId,
        message: validatedData.message,
        status: 'pending',
        updatedAt: new Date(),
      },
    })

    revalidatePath('/networking')
    revalidatePath(`/networking/${validatedData.receiverId}`)
    revalidatePath('/comunidad')

    return {
      success: true,
      message: `Solicitud enviada a ${receiver.fullName}`,
      data: { connectionId: connection.id },
    }
  } catch (error) {
    console.error('Error en sendConnectionRequest:', error)

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar solicitud',
    }
  }
}

// ========================================
// SERVER ACTION: Aceptar/Rechazar conexión
// ========================================

export async function handleConnectionAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const currentUser = await getAuthenticatedUser()

    const validatedData = ConnectionActionSchema.parse({
      connectionId: formData.get('connectionId'),
      action: formData.get('action'),
    })

    const connection = await prisma.connection.findUnique({
      where: { id: validatedData.connectionId },
      include: {
        requester: { select: { fullName: true } },
        receiver: { select: { id: true } },
      },
    })

    if (!connection) {
      return { success: false, error: 'Conexión no encontrada' }
    }

    if (connection.receiver.id !== currentUser.id) {
      return { success: false, error: 'No autorizado' }
    }

    const newStatus = validatedData.action === 'accept'
      ? 'accepted'
      : validatedData.action === 'reject'
      ? 'rejected'
      : 'blocked'

    await prisma.connection.update({
      where: { id: validatedData.connectionId },
      data: { status: newStatus, updatedAt: new Date() },
    })

    revalidatePath('/comunidad')
    revalidatePath('/networking')

    return {
      success: true,
      message: `Solicitud ${newStatus === 'accepted' ? 'aceptada' : 'rechazada'}`,
    }
  } catch (error) {
    console.error('Error en handleConnectionAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar acción',
    }
  }
}

// ========================================
// SERVER ACTION: Eliminar conexión
// ========================================

export async function removeConnection(formData: FormData): Promise<ActionResponse> {
  try {
    const currentUser = await getAuthenticatedUser()
    const connectionId = formData.get('connectionId') as string

    if (!connectionId) {
      return { success: false, error: 'ID de conexión requerido' }
    }

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      return { success: false, error: 'Conexión no encontrada' }
    }

    const isParticipant =
      connection.requesterId === currentUser.id ||
      connection.receiverId === currentUser.id

    if (!isParticipant) {
      return { success: false, error: 'No autorizado' }
    }

    await prisma.connection.delete({ where: { id: connectionId } })

    revalidatePath('/comunidad')
    revalidatePath('/networking')

    return { success: true, message: 'Conexión eliminada' }
  } catch (error) {
    console.error('Error en removeConnection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar conexión',
    }
  }
}

// ========================================
// SERVER ACTION: Obtener conexiones del usuario
// ========================================

export async function getUserConnections() {
  try {
    const currentUser = await getAuthenticatedUser()

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: currentUser.id },
          { receiverId: currentUser.id },
        ],
        status: 'accepted',
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            profession: true,
            company: true,
            commune: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            profession: true,
            company: true,
            commune: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const normalizedConnections = connections.map((conn) => {
      const isRequester = conn.requesterId === currentUser.id
      return {
        id: conn.id,
        connection: isRequester ? conn.receiver : conn.requester,
        createdAt: conn.createdAt,
      }
    })

    return { success: true, data: normalizedConnections }
  } catch (error) {
    console.error('Error en getUserConnections:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener conexiones',
      data: [],
    }
  }
}

// ========================================
// SERVER ACTION: Obtener solicitudes pendientes
// ========================================

export async function getPendingRequests() {
  try {
    const currentUser = await getAuthenticatedUser()

    const pendingRequests = await prisma.connection.findMany({
      where: { receiverId: currentUser.id, status: 'pending' },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            profession: true,
            company: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: pendingRequests }
  } catch (error) {
    console.error('Error en getPendingRequests:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener solicitudes',
      data: [],
    }
  }
}
