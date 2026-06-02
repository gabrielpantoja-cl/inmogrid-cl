// lib/hooks/usePermissions.ts
import { useAuth } from '@/shared/hooks/useAuth'

interface Permissions {
  canEdit: boolean
  canDelete: boolean
  canCreate: boolean
  canView: boolean
}

const DEFAULT_PERMISSIONS: Permissions = {
  canEdit: false,
  canDelete: false,
  canCreate: false,
  canView: true,
}

const ROLE_PERMISSIONS: Record<string, Permissions> = {
  superadmin: { canEdit: true, canDelete: true, canCreate: true, canView: true },
  admin:      { canEdit: true, canDelete: true, canCreate: true, canView: true },
  user:       { ...DEFAULT_PERMISSIONS },
}

export function usePermissions(): Permissions {
  const { role } = useAuth()
  return ROLE_PERMISSIONS[role ?? 'user'] ?? DEFAULT_PERMISSIONS
}
