# 🛠️ Scripts de Desarrollo - inmogrid.cl

Colección de scripts útiles para desarrollo, debugging y deployment de la plataforma inmogrid.cl.

---

## 📋 Índice

- [Gestión de Base de Datos](#-gestión-de-base-de-datos)
- [Autenticación](#-autenticación)
- [Deployment y VPS](#-deployment-y-vps)
- [Desarrollo y Debugging](#-desarrollo-y-debugging)

---

## 🗄️ Gestión de Base de Datos

### `check-db.sh`
**Descripción:** Diagnóstico completo de PostgreSQL (local o VPS)
**Uso:**
```bash
./scripts/check-db.sh local   # Base de datos local
./scripts/check-db.sh vps     # Base de datos en VPS
```
**Verifica:**
- Conectividad a PostgreSQL
- Existencia de tablas (User, Post, Plant, Collection, etc.)
- Datos de NextAuth
- Integridad de la base de datos

---

### `check-env.sh`
**Descripción:** Verifica variables de entorno requeridas
**Uso:**
```bash
./scripts/check-env.sh
```
**Valida:**
- Variables de NextAuth (NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, etc.)
- Variables de base de datos
- Variables de deployment

---

### `db-local-start.sh`
**Descripción:** Inicia base de datos local con Docker
**Uso:**
```bash
./scripts/db-local-start.sh
```
**Función:**
- Levanta contenedor PostgreSQL local
- Configura puerto 5432
- Aplica configuración de desarrollo

---

### `db-sync-from-prod.sh`
**Descripción:** Sincroniza base de datos desde producción
**Uso:**
```bash
./scripts/db-sync-from-prod.sh
```
**⚠️ Precaución:** Sobrescribe base de datos local con datos de producción

---

### `test-inmogrid-db.sh`
**Descripción:** Suite de tests para integridad de la base de datos
**Uso:**
```bash
./scripts/test-inmogrid-db.sh
```
**Tests incluidos:**
- Estructura de tablas
- Relaciones entre modelos
- Constraints y índices
- Datos de ejemplo

---

## 🔐 Autenticación

### `fix-oauth-account-not-linked.sh`
**Descripción:** Arregla problema de cuentas OAuth no vinculadas
**Uso:**
```bash
./scripts/fix-oauth-account-not-linked.sh
```
**Resuelve:** Error "Account not linked" en Google OAuth

---

### `test-auth-local.sh`
**Descripción:** Tests de autenticación en entorno local
**Uso:**
```bash
./scripts/test-auth-local.sh
```
**Verifica:**
- Flujo completo de login
- Creación de sesiones
- Callbacks de NextAuth

---

### `test-auth.sh`
**Descripción:** Tests generales de autenticación (local y producción)
**Uso:**
```bash
./scripts/test-auth.sh
```

---

## 🚀 Deployment y VPS

### `quick-deploy.sh`
**Descripción:** Deploy rápido a VPS sin esperar GitHub Actions
**Uso:**
```bash
./scripts/quick-deploy.sh
```
**Proceso:**
1. Commit y push a GitHub (opcional)
2. Pull en VPS
3. Rebuild de Docker image
4. Restart del contenedor
5. Health check

---

### `quick-fix-vps.sh`
**Descripción:** Fixes rápidos en VPS para emergencias
**Uso:**
```bash
./scripts/quick-fix-vps.sh
```
**Utilidad:** Resolver problemas urgentes de producción

---

### `emergency-recovery.sh`
**Descripción:** Recovery de emergencia del VPS
**Uso:**
```bash
./scripts/emergency-recovery.sh
```
**⚠️ Solo usar en caso de emergencia crítica**

---

### `setup-nginx-inmogrid.sh`
**Descripción:** Configura Nginx para inmogrid.cl
**Uso:**
```bash
./scripts/setup-nginx-inmogrid.sh
```
**Configura:**
- Reverse proxy
- SSL/TLS (Let's Encrypt)
- Redirecciones HTTP → HTTPS

---

### `setup-swap-vps.sh`
**Descripción:** Configura memoria swap en VPS
**Uso:**
```bash
./scripts/setup-swap-vps.sh
```
**Recomendado:** Ejecutar una vez al configurar VPS nuevo

---

## 🧪 Desarrollo y Debugging

### `check-user-profile.ts`
**Descripción:** Verifica perfil de usuario en base de datos
**Uso:**
```bash
# Por email
npx tsx scripts/check-user-profile.ts usuario@example.com

# Por username
npx tsx scripts/check-user-profile.ts usuario-ejemplo
```
**Muestra:**
- Información del perfil
- Plantas del usuario
- Posts publicados
- Colecciones

---

### `check-images.js`
**Descripción:** Verifica estado de imágenes del proyecto
**Uso:**
```bash
node scripts/check-images.js
```
**Verifica:**
- Existencia de imágenes
- Tamaño de archivos
- Imágenes optimizadas disponibles

---

### `optimize-images.js`
**Descripción:** Optimiza imágenes del proyecto (WebP, compresión)
**Uso:**
```bash
node scripts/optimize-images.js
```
**Prerequisito:** `npm install sharp --save-dev`
**Genera:** Imágenes optimizadas en `/public/images/optimized/`

---

### `verify-chat-module.js`
**Descripción:** Verifica integridad del módulo de chat
**Uso:**
```bash
node scripts/verify-chat-module.js
```
**Verifica:**
- Dependencias instaladas
- Imports correctos
- Generación de UUIDs
- Manejo de errores

---

## 📝 Notas Importantes

### Permisos de Ejecución
Si un script no es ejecutable:
```bash
chmod +x scripts/nombre-del-script.sh
```

### Entorno Local vs VPS
- **Scripts `.sh`:** Generalmente requieren especificar entorno (`local` o `vps`)
- **Scripts `.ts`:** Usan `.env` o `.env.local` automáticamente
- **Scripts `.js`:** Usan Node.js nativo

### Variables de Entorno
Asegúrate de tener configurados:
- `.env.local` para desarrollo
- Variables de entorno en VPS para producción

---

## 🤝 Contribuir

Al agregar nuevos scripts:
1. Documentarlos en este README
2. Incluir comentarios en el código
3. Usar nombres descriptivos
4. Probar en local antes de producción

---

**Última actualización:** 2026-01-02
**Proyecto:** inmogrid.cl
**Mantenedor:** equipo inmogrid.cl (hola@inmogrid.cl)
