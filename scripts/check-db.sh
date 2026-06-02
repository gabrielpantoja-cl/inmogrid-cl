#!/bin/bash

# ==========================================
# 🗄️ Script de Diagnóstico de Base de Datos
# ==========================================
# Proyecto: inmogrid.cl
# Descripción: Verifica conectividad, tablas y datos de NextAuth
# Uso: ./scripts/check-db.sh [local|vps]
# ==========================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determinar modo
MODE="${1:-local}"

echo "🗄️  Diagnóstico de Base de Datos - inmogrid.cl"
echo "============================================="
echo ""

if [ "$MODE" = "vps" ]; then
  echo "📍 Modo: VPS (Producción)"
  echo "🔌 Puerto: 5433 (PostgreSQL dedicado)"
  CONTAINER_NAME="inmogrid-db"
  DB_USER="inmogrid_user"
  DB_NAME="inmogrid"
else
  echo "📍 Modo: Local (Desarrollo)"
  CONTAINER_NAME="postgres"
  DB_USER="postgres"
  DB_NAME="inmogrid_dev"
fi

echo ""

# Función para ejecutar SQL
run_sql() {
  local SQL=$1
  if [ "$MODE" = "vps" ]; then
    docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "$SQL" 2>&1
  else
    # Local: intentar con docker o psql nativo
    if docker ps | grep -q postgres; then
      docker exec -i postgres psql -U postgres -d $DB_NAME -c "$SQL" 2>&1
    else
      psql -U postgres -d $DB_NAME -c "$SQL" 2>&1
    fi
  fi
}

# Test 1: Conectividad
echo "🔌 Test 1: Verificando conectividad..."
echo "---------------------------------------"

if run_sql "SELECT version();" | grep -q "PostgreSQL"; then
  VERSION=$(run_sql "SELECT version();" | grep PostgreSQL | cut -d ',' -f 1)
  echo -e "${GREEN}✅ Conexión exitosa${NC}"
  echo "   $VERSION"
else
  echo -e "${RED}❌ No se pudo conectar a PostgreSQL${NC}"
  echo ""
  echo "📝 Posibles causas:"
  echo "   - El contenedor no está corriendo"
  echo "   - Credenciales incorrectas"
  echo "   - Base de datos no existe"
  exit 1
fi

echo ""

# Test 2: Extensiones PostGIS
echo "🗺️  Test 2: Verificando extensión PostGIS..."
echo "---------------------------------------------"

if run_sql "SELECT PostGIS_version();" | grep -q "POSTGIS"; then
  POSTGIS_VERSION=$(run_sql "SELECT PostGIS_version();" | grep POSTGIS | head -1)
  echo -e "${GREEN}✅ PostGIS instalado${NC}"
  echo "   $POSTGIS_VERSION"
else
  echo -e "${YELLOW}⚠️  PostGIS NO instalado (requerido para geolocalización)${NC}"
  echo "   Ejecutar: CREATE EXTENSION IF NOT EXISTS postgis;"
fi

echo ""

# Test 3: Tablas de NextAuth
echo "🔐 Test 3: Verificando tablas de NextAuth..."
echo "---------------------------------------------"

NEXTAUTH_TABLES=("User" "Account" "Session" "VerificationToken")
MISSING_TABLES=0

for TABLE in "${NEXTAUTH_TABLES[@]}"; do
  if run_sql "SELECT to_regclass('public.\"$TABLE\"');" | grep -q "$TABLE"; then
    echo -e "${GREEN}✅ Tabla \"$TABLE\" existe${NC}"
  else
    echo -e "${RED}❌ Tabla \"$TABLE\" NO existe${NC}"
    MISSING_TABLES=$((MISSING_TABLES + 1))
  fi
done

echo ""

if [ $MISSING_TABLES -gt 0 ]; then
  echo -e "${RED}❌ Faltan $MISSING_TABLES tablas de NextAuth${NC}"
  echo ""
  echo "📝 Solución: Aplicar schema de Prisma"
  echo "   npx prisma db push"
  exit 1
fi

# Test 4: Conteo de registros
echo "📊 Test 4: Conteo de registros..."
echo "----------------------------------"

# Usuarios
USER_COUNT=$(run_sql "SELECT COUNT(*) FROM \"User\";" | grep -E "^\s*[0-9]+" | tr -d ' ')
echo "👥 Usuarios: $USER_COUNT"

if [ "$USER_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No hay usuarios registrados${NC}"
else
  echo -e "${GREEN}✅ Hay $USER_COUNT usuarios${NC}"
fi

# Cuentas OAuth
ACCOUNT_COUNT=$(run_sql "SELECT COUNT(*) FROM \"Account\";" | grep -E "^\s*[0-9]+" | tr -d ' ')
echo "🔑 Cuentas OAuth: $ACCOUNT_COUNT"

# Sesiones activas
SESSION_COUNT=$(run_sql "SELECT COUNT(*) FROM \"Session\" WHERE expires > NOW();" | grep -E "^\s*[0-9]+" | tr -d ' ')
echo "🔓 Sesiones activas: $SESSION_COUNT"

# Propiedades (si existe la tabla)
if run_sql "SELECT to_regclass('public.\"Property\"');" | grep -q "Property"; then
  PROPERTY_COUNT=$(run_sql "SELECT COUNT(*) FROM \"Property\";" | grep -E "^\s*[0-9]+" | tr -d ' ')
  echo "🏠 Propiedades: $PROPERTY_COUNT"
fi

# Referenciales CBR
if run_sql "SELECT to_regclass('public.referenciales');" | grep -q "referenciales"; then
  REF_COUNT=$(run_sql "SELECT COUNT(*) FROM referenciales;" | grep -E "^\s*[0-9]+" | tr -d ' ')
  echo "📋 Referenciales CBR: $REF_COUNT"
fi

echo ""

# Test 5: Últimos usuarios
if [ "$USER_COUNT" -gt 0 ]; then
  echo "👤 Test 5: Últimos usuarios creados..."
  echo "---------------------------------------"

  run_sql "SELECT
    id,
    email,
    name,
    role,
    \"createdAt\"
  FROM \"User\"
  ORDER BY \"createdAt\" DESC
  LIMIT 5;"

  echo ""
fi

# Test 6: Estructura de tabla User
echo "🏗️  Test 6: Verificando estructura de tabla User..."
echo "----------------------------------------------------"

REQUIRED_COLUMNS=(
  "id"
  "email"
  "name"
  "role"
  "createdAt"
  "updatedAt"
)

MISSING_COLUMNS=0

for COLUMN in "${REQUIRED_COLUMNS[@]}"; do
  if run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = '$COLUMN';" | grep -q "$COLUMN"; then
    echo -e "${GREEN}✅ Columna \"$COLUMN\" existe${NC}"
  else
    echo -e "${RED}❌ Columna \"$COLUMN\" NO existe${NC}"
    MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
  fi
done

echo ""

if [ $MISSING_COLUMNS -gt 0 ]; then
  echo -e "${RED}❌ La tabla User no tiene la estructura correcta${NC}"
  echo ""
  echo "📝 Solución: Aplicar schema de Prisma"
  echo "   npx prisma db push"
  exit 1
fi

# Test 7: Índices importantes
echo "⚡ Test 7: Verificando índices..."
echo "---------------------------------"

INDEXES=$(run_sql "SELECT indexname FROM pg_indexes WHERE tablename = 'User';" | grep -E "^\s*\w+" | wc -l)
echo "📌 Índices en tabla User: $INDEXES"

if [ "$INDEXES" -lt 2 ]; then
  echo -e "${YELLOW}⚠️  Pocos índices (puede afectar rendimiento)${NC}"
else
  echo -e "${GREEN}✅ Índices configurados${NC}"
fi

echo ""

# Resumen final
echo "=================================================="
echo "📊 Resumen del Diagnóstico:"
echo "=================================================="
echo ""

ERRORS=0

# Verificar conexión
if ! run_sql "SELECT 1;" | grep -q "1"; then
  echo -e "${RED}❌ Error de conexión${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Verificar tablas
if [ $MISSING_TABLES -gt 0 ]; then
  echo -e "${RED}❌ Faltan tablas de NextAuth${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Verificar columnas
if [ $MISSING_COLUMNS -gt 0 ]; then
  echo -e "${RED}❌ Estructura de tabla User incorrecta${NC}"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Base de datos configurada correctamente${NC}"
  echo ""
  echo "📊 Estadísticas:"
  echo "   - Usuarios: $USER_COUNT"
  echo "   - Cuentas OAuth: $ACCOUNT_COUNT"
  echo "   - Sesiones activas: $SESSION_COUNT"
  echo ""
  echo "🚀 Siguiente paso: Verificar autenticación"
  echo "   ./scripts/test-auth.sh"
  exit 0
else
  echo -e "${RED}❌ Se encontraron $ERRORS errores${NC}"
  echo ""
  echo "📝 Acciones requeridas:"
  echo "1. Aplicar schema de Prisma: npx prisma db push"
  echo "2. Verificar credenciales en .env"
  echo "3. Volver a ejecutar este script"
  exit 1
fi