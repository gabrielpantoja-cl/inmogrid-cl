'use client'

/**
 * ========================================
 * INMOGRID.CL - CONNECTION BUTTON (React 19)
 * ========================================
 * Componente moderno con:
 * - useOptimistic para UI instant updates
 * - useActionState para manejar Server Actions
 * - Progressive Enhancement
 * ========================================
 */

import { useOptimistic, useActionState, useTransition } from 'react'
import { sendConnectionRequest, removeConnection } from '../actions/networking'
import { Loader2, UserPlus, UserMinus } from 'lucide-react'

type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'rejected'

interface ConnectionButtonProps {
  userId: string
  userName: string
  currentStatus: ConnectionStatus
  connectionId?: string | null
}

export function ConnectionButton({
  userId,
  userName,
  currentStatus: initialStatus,
  connectionId: initialConnectionId,
}: ConnectionButtonProps) {
  // ========================================
  // STATE MANAGEMENT (React 19 hooks)
  // ========================================

  const [isPending, startTransition] = useTransition()

  // Optimistic UI - actualiza instantáneamente antes de respuesta del servidor
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<ConnectionStatus>(
    initialStatus
  )

  // ========================================
  // HANDLER: Enviar solicitud
  // ========================================

  async function handleSendRequest() {
    startTransition(async () => {
      // Update UI optimistically
      setOptimisticStatus('pending')

      // Create FormData
      const formData = new FormData()
      formData.append('receiverId', userId)
      formData.append('message', `¡Hola! Me gustaría conectar contigo en inmogrid.`)

      // Execute Server Action
      const result = await sendConnectionRequest(formData)

      if (!result.success) {
        // Revert optimistic update on error
        setOptimisticStatus(initialStatus)
        alert(result.error || 'Error al enviar solicitud')
      }
      // If success, Next.js revalidatePath will update the UI automatically
    })
  }

  // ========================================
  // HANDLER: Eliminar conexión
  // ========================================

  async function handleRemoveConnection() {
    if (!initialConnectionId) return

    const confirmed = confirm(
      `¿Estás seguro de eliminar la conexión con ${userName}?`
    )

    if (!confirmed) return

    startTransition(async () => {
      // Update UI optimistically
      setOptimisticStatus('none')

      // Create FormData
      const formData = new FormData()
      formData.append('connectionId', initialConnectionId)

      // Execute Server Action
      const result = await removeConnection(formData)

      if (!result.success) {
        // Revert optimistic update on error
        setOptimisticStatus(initialStatus)
        alert(result.error || 'Error al eliminar conexión')
      }
    })
  }

  // ========================================
  // RENDER LOGIC
  // ========================================

  // Loading state
  if (isPending) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Procesando...
      </button>
    )
  }

  // Accepted connection
  if (optimisticStatus === 'accepted') {
    return (
      <button
        onClick={handleRemoveConnection}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
      >
        <UserMinus className="w-4 h-4" />
        Desconectar
      </button>
    )
  }

  // Pending request (sent)
  if (optimisticStatus === 'pending') {
    return (
      <button
        onClick={handleRemoveConnection}
        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
      >
        <Loader2 className="w-4 h-4" />
        Solicitud enviada
      </button>
    )
  }

  // No connection - show connect button
  return (
    <button
      onClick={handleSendRequest}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <UserPlus className="w-4 h-4" />
      Conectar
    </button>
  )
}
