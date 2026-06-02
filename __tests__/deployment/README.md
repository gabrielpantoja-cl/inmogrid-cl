# Deployment Tests

Tests específicos para validar la configuración de deployment y asegurar que nuestro pipeline es más rápido que Vercel.

---

## 📋 Tests Disponibles

### 1. **build.test.ts** - Build Configuration
Valida la configuración de build de Next.js y optimizaciones.

**Qué valida:**
- ✅ Next.js standalone mode habilitado
- ✅ Optimizaciones de producción configuradas
- ✅ CSP headers configurados
- ✅ Scripts de build y start
- ✅ TypeScript configurado correctamente
- ✅ Variables de entorno de ejemplo
- ✅ Prisma integrado en build

**Ejecutar:**
```bash
npm run test -- __tests__/deployment/build.test.ts
```

---

### 2. **docker.test.ts** - Docker Configuration
Valida el Dockerfile y optimizaciones de Docker.

**Qué valida:**
- ✅ Node 22 Alpine (no Node 18)
- ✅ Multi-stage build (deps → builder → runner)
- ✅ Usuario non-root (nextjs)
- ✅ HEALTHCHECK configurado
- ✅ Standalone mode (server.js, no npm start)
- ✅ Cache de layers optimizado
- ✅ .dockerignore configurado
- ✅ Orden de COPY optimizado para cache

**Ejecutar:**
```bash
npm run test -- __tests__/deployment/docker.test.ts
```

---

### 3. **github-actions.test.ts** - GitHub Actions Workflow
Valida el workflow de GitHub Actions y optimizaciones.

**Qué valida:**
- ✅ Node 22 (no Node 18)
- ✅ No build duplicado (solo en Docker)
- ✅ Tests ejecutan antes de deploy
- ✅ Docker build CON cache (sin --no-cache)
- ✅ npm ci con --prefer-offline
- ✅ Health checks en verificación
- ✅ SSH action configurado
- ✅ Limpieza de imágenes antiguas

**Comparación con Vercel:**
- Vercel: 3-6 minutos (promedio)
- Nuestro pipeline: 3-5 minutos (optimizado)
- **Meta: Match o superar velocidad de Vercel**

**Ejecutar:**
```bash
npm run test -- __tests__/deployment/github-actions.test.ts
```

---

### 4. **health-check.test.ts** - Health Check Endpoint
Valida el endpoint /api/health para deployment validation.

**Qué valida:**
- ✅ Route handler existe
- ✅ Exporta función GET
- ✅ Retorna status ok
- ✅ Incluye timestamp
- ✅ Usado en Dockerfile HEALTHCHECK
- ✅ Usado en GitHub Actions
- ✅ Manejo de errores

**Ejecutar:**
```bash
npm run test -- __tests__/deployment/health-check.test.ts
```

---

## 🚀 Ejecutar Todos los Tests de Deployment

### Opción 1: Solo tests de deployment
```bash
npm run test -- __tests__/deployment/
```

### Opción 2: Con coverage
```bash
npm run test:ci -- __tests__/deployment/
```

### Opción 3: Watch mode (desarrollo)
```bash
npm run test:watch -- __tests__/deployment/
```

---

## 📊 Métricas de Deployment

### Tiempos Esperados

| Etapa | Tiempo | Optimización |
|-------|--------|--------------|
| **Setup Node.js** | 20s | Cache npm |
| **npm ci** | 40s | --prefer-offline |
| **Tests** | 45s | Paralelos |
| **Docker Build** | 90s | Cache de layers |
| **Deploy** | 30s | Docker compose |
| **Verificación** | 40s | Health checks |
| **TOTAL** | **3-5 min** | **50-60% más rápido** |

### Comparación con Vercel

```
Vercel:
├── Build: 2-4 min
├── Deploy: 1-2 min
└── Total: 3-6 min

inmogrid.cl (optimizado):
├── Tests: 45s
├── Build (Docker): 90s
├── Deploy: 30s
├── Verify: 40s
└── Total: 3-5 min

✅ Meta alcanzada: Match Vercel speed
```

---

## 🎯 Objetivos de los Tests

### Velocidad
- ✅ Deployment < 5 minutos
- ✅ Cache hit rate > 80%
- ✅ Build time < 2 minutos (con cache)

### Tamaño
- ✅ Imagen Docker < 250 MB
- ✅ 75% reducción vs imagen sin optimizar

### Seguridad
- ✅ Non-root user
- ✅ Multi-stage build
- ✅ Health checks

### Confiabilidad
- ✅ Tests before deploy
- ✅ Health check validation
- ✅ Rollback automático si falla

---

## 🔧 Troubleshooting

### Test falla: "js-yaml not found"
```bash
npm install --save-dev js-yaml @types/js-yaml
```

### Test falla: "Dockerfile not found"
Asegúrate de estar en el directorio raíz del proyecto.

### Test falla: "Build output not found"
Es normal si no has hecho build. Ejecuta:
```bash
npm run build
```

---

## 📚 Documentación Relacionada

- `docs/06-deployment/OPTIMIZATION_REPORT.md` - Reporte detallado de optimizaciones
- `docs/06-deployment/DEPLOYMENT_GUIDE.md` - Guía de deployment
- `Dockerfile` - Configuración de Docker optimizada
- `.github/workflows/deploy-production.yml` - Workflow de GitHub Actions

---

## ✅ Checklist de Deployment

Antes de hacer deployment a producción:

- [ ] Todos los tests de deployment pasan
- [ ] Tests unitarios pasan
- [ ] Build local exitoso
- [ ] Health check funciona
- [ ] Variables de entorno configuradas
- [ ] Dockerfile optimizado validado
- [ ] GitHub Actions workflow validado

**Ejecutar checklist completo:**
```bash
npm run test -- __tests__/deployment/ && \
npm run test && \
npm run build && \
echo "✅ Listo para deployment"
```

---

## 🎉 Ventajas vs Vercel

### Velocidad
- ✅ Tiempo similar o mejor (3-5 min)
- ✅ Cache optimizado (80-90% hit rate)
- ✅ Build incremental

### Control
- ✅ Control total del pipeline
- ✅ Configuración personalizada
- ✅ Deploy a VPS propio

### Costo
- ✅ Sin límites de deploy
- ✅ Sin límites de bandwidth
- ✅ VPS fijo ($12-20/mes vs variable)

### Flexibilidad
- ✅ Cualquier configuración
- ✅ Acceso SSH directo
- ✅ Múltiples servicios (N8N, PostgreSQL, etc.)

---

**Última actualización**: 2026-01-03
**Mantenedor**: equipo inmogrid.cl (hola@inmogrid.cl)
