# Tests de Red Social - inmogrid.cl

## 📋 Resumen Ejecutivo

Este documento describe el estado actual de las rutas de red social y los tests implementados para validar las funcionalidades básicas.

## 🎯 Funcionalidades Cubiertas por Tests

### ✅ Tests Implementados (21 tests totales)

#### 1. **Lectura de Posts Públicos** (3 tests - ✅ PASANDO)
- ✅ Listar posts públicos sin autenticación
- ✅ Mostrar solo posts con `published: true`
- ✅ Incluir información del autor (name, username)

#### 2. **Creación de Posts** (4 tests - ⚠️ EN DESARROLLO)
- ⚠️ Crear post cuando usuario está autenticado
- ⚠️ Rechazar creación sin autenticación (401)
- ⚠️ Validar campos requeridos (título y contenido)
- ⚠️ Generar slug único automáticamente

#### 3. **Edición de Posts** (3 tests - ⚠️ EN DESARROLLO)
- ⚠️ Actualizar post del usuario autenticado
- ⚠️ Rechazar edición de post ajeno (404)
- ⚠️ Actualizar `publishedAt` al publicar por primera vez

#### 4. **Eliminación de Posts** (2 tests - ⚠️ EN DESARROLLO)
- ⚠️ Eliminar post del usuario autenticado
- ⚠️ Rechazar eliminación de post ajeno (404)

#### 5. **Visualización de Perfil Público** (3 tests - ✅ PASANDO)
- ✅ Mostrar perfil público sin autenticación
- ✅ Incluir posts publicados en el perfil
- ✅ No mostrar perfil si `isPublicProfile: false`

#### 6. **Edición de Perfil** (3 tests - 🔴 PENDIENTE IMPLEMENTACIÓN)
- 🔴 Actualizar datos básicos (name, bio, tagline)
- 🔴 Validar formato de campos (email, linkedin, etc)
- 🔴 Cambiar visibilidad del perfil (`isPublicProfile`)

#### 7. **Listar Posts del Usuario** (2 tests - ⚠️ EN DESARROLLO)
- ⚠️ Listar todos los posts del usuario autenticado
- ⚠️ Filtrar por estado de publicación (`published`)

---

## 🚨 Estado Actual de Implementación

### ✅ **RUTAS EXISTENTES**

#### API de Posts (Autenticado)
```
✅ GET    /api/posts              - Lista posts del usuario
✅ POST   /api/posts              - Crea un nuevo post
✅ GET    /api/posts/[id]         - Obtiene post específico
✅ PUT    /api/posts/[id]         - Actualiza post
✅ DELETE /api/posts/[id]         - Elimina post
```

**Archivo**: `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`

#### Visualización Pública
```
✅ GET /[username]                 - Perfil público
✅ GET /[username]/notas           - Lista de notas públicas
✅ GET /[username]/notas/[slug]    - Nota específica
✅ GET /[username]/plantas         - Lista de plantas
✅ GET /[username]/plantas/[slug]  - Planta específica
```

**Archivo**: `src/app/[username]/page.tsx`

#### Dashboard
```
✅ GET /dashboard                  - Panel principal (feed de posts)
✅ GET /dashboard/notas            - Gestión de notas
✅ GET /dashboard/notas/crear      - Crear nota
```

**Archivos**: `src/app/dashboard/(overview)/page.tsx`

---

### ❌ **RUTAS FALTANTES - CRÍTICAS**

#### ⚠️ API de Perfil (NO EXISTE)
```
❌ GET  /api/users/profile         - Obtener perfil del usuario autenticado
❌ PUT  /api/users/profile         - Actualizar perfil del usuario
❌ POST /api/users/profile/avatar  - Subir avatar
```

**Prioridad**: 🔴 ALTA - Necesario para editar perfil básico

#### ⚠️ Página de Edición de Perfil (NO EXISTE)
```
❌ GET /dashboard/perfil           - Formulario de edición de perfil
```

**Prioridad**: 🔴 ALTA - URL mencionada en el dashboard pero no implementada

**Referencia**: El dashboard tiene un enlace a `/dashboard/perfil` (línea 68 de `DashboardContent.tsx`) pero la página no existe.

---

## 🐛 Problemas Identificados

### 1. **NextResponse Mock en Tests**
Los tests de API fallan con `TypeError: Response.json is not a function`.

**Causa**: Jest no tiene soporte completo para Web APIs de Next.js en entorno de testing.

**Solución temporal**: Los tests de lógica Prisma están pasando. Para tests de endpoints completos, considerar:
- Usar `@jest/globals` con mejor configuración de mocks
- Implementar tests E2E con Playwright
- Mock completo de `NextResponse`

### 2. **Ruta `/dashboard/perfil` No Implementada**
El dashboard incluye un botón "Mi Perfil" que apunta a `/dashboard/perfil`, pero esta ruta no existe.

**Impacto**: Los usuarios no pueden editar su perfil básico desde el dashboard.

**Prioridad**: 🔴 CRÍTICA

---

## 📁 Estructura de Archivos de Tests

```
__tests__/
├── api/
│   ├── social-network.test.ts     ← NUEVO - Tests de red social
│   ├── public-api.test.ts         ← Existente - Tests de API pública
│   ├── public/
│   │   ├── health.test.ts
│   │   ├── map-data.test.ts
│   │   └── map-config.test.ts
│   └── ...
├── __helpers__/
│   ├── setup-test-env.ts
│   ├── test-utils.ts
│   └── database-helper.ts
├── __mocks__/
│   ├── next-auth.ts
│   ├── prisma.ts
│   └── ...
└── README-SOCIAL-NETWORK-TESTS.md ← NUEVO - Este archivo
```

---

## 🛠️ Plan de Acción

### Fase 1: Implementar Funcionalidad Crítica (Prioridad ALTA)

#### 1.1. Crear API de Perfil (`/api/users/profile`)

**Archivo**: `src/app/api/users/profile/route.ts`

```typescript
// GET - Obtener perfil del usuario autenticado
export async function GET(request: NextRequest) {
  const session = await auth();
  // ... retornar datos de perfil
}

// PUT - Actualizar perfil del usuario autenticado
export async function PUT(request: NextRequest) {
  const session = await auth();
  // ... validar y actualizar campos permitidos
}
```

**Campos permitidos para actualización**:
- `name`: string
- `bio`: string | null
- `tagline`: string | null
- `profession`: ProfessionType | null
- `company`: string | null
- `phone`: string | null
- `region`: string | null
- `commune`: string | null
- `website`: string | null (validar URL)
- `linkedin`: string | null (validar URL)
- `isPublicProfile`: boolean
- `location`: string | null
- `identityTags`: string[]
- `externalLinks`: Json | null

**Validaciones requeridas**:
- URLs válidas para `website` y `linkedin`
- Formato de teléfono chileno para `phone` (opcional)
- `profession` debe ser uno de los valores del enum `ProfessionType`

#### 1.2. Crear Página de Edición de Perfil

**Archivo**: `src/app/dashboard/perfil/page.tsx`

```typescript
// Componente Server para cargar datos
export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions);
  // ... obtener datos de usuario
  return <ProfileEditForm user={user} />;
}
```

**Archivo**: `src/components/forms/ProfileEditForm.tsx`

Formulario con React Hook Form para editar:
- Información básica (name, bio, tagline)
- Información profesional (profession, company)
- Contacto (phone, website, linkedin)
- Ubicación (region, commune)
- Privacidad (`isPublicProfile`)

#### 1.3. Actualizar Tests

Una vez implementadas las rutas:
1. Quitar `.skip()` de los tests de perfil
2. Ajustar mocks de `NextResponse` si es necesario
3. Ejecutar suite completa de tests

---

### Fase 2: Mejorar Tests (Prioridad MEDIA)

#### 2.1. Configurar Mocks de NextResponse

Investigar y aplicar configuración adecuada para que `NextResponse.json()` funcione en tests.

**Referencias**:
- Documentación de Next.js testing
- Ejemplos de tests existentes en `__tests__/api/public/`

#### 2.2. Tests E2E con Playwright

Para validación completa de flujos de usuario:
- Registro y login con Google OAuth
- Edición de perfil
- Creación y publicación de posts
- Visualización de perfil público

---

### Fase 3: Funcionalidades Adicionales (Prioridad BAJA)

Según el roadmap de `CLAUDE.md`:
- **Phase 2**: Sistema de conexiones (seguir usuarios)
- **Phase 2**: Sistema de mensajería 1-a-1
- **Phase 2**: Foro de discusión
- **Phase 3**: Blog CMS con MDX
- **Phase 4**: Sofía AI Bot (RAG)

---

## 🧪 Ejecutar Tests

### Todos los tests de red social
```bash
npm test -- __tests__/api/social-network.test.ts
```

### Solo tests que pasan actualmente
```bash
npm test -- __tests__/api/social-network.test.ts -t "Lectura de Posts Públicos"
npm test -- __tests__/api/social-network.test.ts -t "Visualización de Perfil Público"
```

### Watch mode para desarrollo
```bash
npm test -- __tests__/api/social-network.test.ts --watch
```

---

## 📊 Cobertura de Tests Actual

```
✅ Lectura pública:      100% (3/3 tests pasando)
⚠️  APIs autenticadas:    0% (11/11 tests con error de mock)
✅ Visualización:        100% (3/3 tests pasando)
🔴 Edición de perfil:     0% (3/3 tests skipped - no implementado)

Total: 6/18 tests pasando (33%)
```

---

## 🔗 Referencias

### Documentación del Proyecto
- **Plan de Trabajo**: `docs/01-introduccion/Plan_Trabajo_Ecosistema_Digital_V4.md`
- **CLAUDE.md**: `CLAUDE.md` (raíz del proyecto)
- **Database Schema**: `prisma/schema.prisma`

### Archivos Clave
- **API Posts**: `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`
- **Perfil Público**: `src/app/[username]/page.tsx`
- **Dashboard**: `src/app/dashboard/(overview)/page.tsx`
- **Schema Prisma**: `prisma/schema.prisma` (modelo `User`)

### Tests Relacionados
- **Public API Tests**: `__tests__/api/public-api.test.ts`
- **Auth Tests**: `__tests__/auth/auth-integration.test.ts`
- **OAuth Tests**: `__tests__/e2e/google-oauth.test.ts`

---

## 💡 Notas Importantes

### Seguridad
- ✅ Todos los endpoints de edición requieren autenticación
- ✅ Multi-tenant isolation: usuarios solo pueden editar su propio contenido
- ✅ Validación de ownership en PUT/DELETE de posts
- ⚠️ Falta implementar rate limiting para endpoints de escritura

### Performance
- ✅ Uso de `select` en Prisma para reducir datos transferidos
- ✅ Índices en campos comunes (`userId`, `published`, `slug`)
- ⚠️ Considerar paginación para lista de posts

### UX/UI
- ✅ Links a `/dashboard/perfil` existen en UI
- ❌ Ruta `/dashboard/perfil` NO implementada (404)
- ⚠️ Usuarios no pueden editar su información básica

---

**Última actualización**: 2025-11-23
**Autor**: equipo inmogrid.cl
**Proyecto**: inmogrid.cl - Ecosistema Digital Colaborativo
