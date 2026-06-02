#!/bin/bash

# ==========================================
# 🔍 Script de Verificación de Variables de Entorno
# ==========================================
# Proyecto: inmogrid.cl
# Descripción: Verifica que todas las variables requeridas estén configuradas
# Uso: ./scripts/check-env.sh
# ==========================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verificando Variables de Entorno para inmogrid.cl"
echo "=================================================="
echo ""

# Verificar si estamos en local o VPS
if [ -f ".env.local" ]; then
  ENV_FILE=".env.local"
  echo "📁 Modo: Desarrollo Local (.env.local)"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
  echo "📁 Modo: Producción (.env)"
else
  echo -e "${RED}❌ No se encontró archivo .env o .env.local${NC}"
  exit 1
fi

echo ""

# Variables requeridas
REQUIRED_VARS=(
  "POSTGRES_PRISMA_URL"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "NODE_ENV"
)

# Variables opcionales pero recomendadas
OPTIONAL_VARS=(
  "GOOGLE_MAPS_API_KEY"
  "N8N_WEBHOOK_URL"
  "N8N_WEBHOOK_SECRET"
)

MISSING_VARS=0
WEAK_VARS=0

# Función para verificar variable
check_var() {
  local VAR_NAME=$1
  local IS_REQUIRED=$2

  # Leer valor del archivo .env
  VALUE=$(grep "^${VAR_NAME}=" $ENV_FILE 2>/dev/null | cut -d '=' -f 2- | tr -d '"' || echo "")

  if [ -z "$VALUE" ]; then
    if [ "$IS_REQUIRED" = "true" ]; then
      echo -e "${RED}❌ $VAR_NAME: NO CONFIGURADA${NC}"
      MISSING_VARS=$((MISSING_VARS + 1))
    else
      echo -e "${YELLOW}⚠️  $VAR_NAME: NO CONFIGURADA (opcional)${NC}"
    fi
  else
    # Verificar valores por defecto o débiles
    if [[ "$VALUE" == *"your_"* ]] || [[ "$VALUE" == *"PASSWORD"* ]] || [[ "$VALUE" == *"CHANGE_ME"* ]]; then
      echo -e "${YELLOW}⚠️  $VAR_NAME: USAR VALOR POR DEFECTO (INSEGURO)${NC}"
      WEAK_VARS=$((WEAK_VARS + 1))
    else
      # Ocultar valores sensibles
      if [[ "$VAR_NAME" == *"SECRET"* ]] || [[ "$VAR_NAME" == *"PASSWORD"* ]] || [[ "$VAR_NAME" == *"KEY"* ]]; then
        MASKED_VALUE="${VALUE:0:10}..."
      else
        MASKED_VALUE="$VALUE"
      fi
      echo -e "${GREEN}✅ $VAR_NAME: $MASKED_VALUE${NC}"
    fi
  fi
}

# Verificar variables requeridas
echo "📋 Variables Requeridas:"
echo "------------------------"
for VAR in "${REQUIRED_VARS[@]}"; do
  check_var "$VAR" "true"
done

echo ""
echo "📋 Variables Opcionales:"
echo "------------------------"
for VAR in "${OPTIONAL_VARS[@]}"; do
  check_var "$VAR" "false"
done

# Validaciones específicas
echo ""
echo "🔐 Validaciones de Seguridad:"
echo "------------------------------"

# Validar longitud de NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" $ENV_FILE 2>/dev/null | cut -d '=' -f 2- | tr -d '"' || echo "")
if [ ! -z "$NEXTAUTH_SECRET" ]; then
  SECRET_LENGTH=${#NEXTAUTH_SECRET}
  if [ $SECRET_LENGTH -lt 32 ]; then
    echo -e "${YELLOW}⚠️  NEXTAUTH_SECRET muy corto (${SECRET_LENGTH} chars, recomendado: 32+)${NC}"
    WEAK_VARS=$((WEAK_VARS + 1))
  else
    echo -e "${GREEN}✅ NEXTAUTH_SECRET tiene longitud adecuada (${SECRET_LENGTH} chars)${NC}"
  fi
fi

# Validar formato de POSTGRES_PRISMA_URL
POSTGRES_URL=$(grep "^POSTGRES_PRISMA_URL=" $ENV_FILE 2>/dev/null | cut -d '=' -f 2- | tr -d '"' || echo "")
if [ ! -z "$POSTGRES_URL" ]; then
  if [[ "$POSTGRES_URL" == postgresql://* ]]; then
    echo -e "${GREEN}✅ POSTGRES_PRISMA_URL tiene formato válido${NC}"
  else
    echo -e "${RED}❌ POSTGRES_PRISMA_URL formato inválido (debe empezar con postgresql://)${NC}"
    MISSING_VARS=$((MISSING_VARS + 1))
  fi
fi

# Validar NEXTAUTH_URL según ambiente
NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" $ENV_FILE 2>/dev/null | cut -d '=' -f 2- | tr -d '"' || echo "")
NODE_ENV=$(grep "^NODE_ENV=" $ENV_FILE 2>/dev/null | cut -d '=' -f 2- | tr -d '"' || echo "development")

if [ ! -z "$NEXTAUTH_URL" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    if [[ "$NEXTAUTH_URL" == "https://inmogrid.cl" ]]; then
      echo -e "${GREEN}✅ NEXTAUTH_URL configurada para producción${NC}"
    else
      echo -e "${YELLOW}⚠️  NEXTAUTH_URL no coincide con producción (esperado: https://inmogrid.cl)${NC}"
    fi
  else
    if [[ "$NEXTAUTH_URL" == "http://localhost:3000" ]]; then
      echo -e "${GREEN}✅ NEXTAUTH_URL configurada para desarrollo${NC}"
    else
      echo -e "${YELLOW}⚠️  NEXTAUTH_URL no coincide con desarrollo (esperado: http://localhost:3000)${NC}"
    fi
  fi
fi

# Resumen final
echo ""
echo "=================================================="
echo "📊 Resumen:"
echo "=================================================="

if [ $MISSING_VARS -eq 0 ] && [ $WEAK_VARS -eq 0 ]; then
  echo -e "${GREEN}✅ Todas las variables requeridas están correctamente configuradas${NC}"
  echo ""
  echo "🚀 Siguiente paso: Verificar base de datos"
  echo "   ./scripts/check-db.sh"
  exit 0
elif [ $MISSING_VARS -gt 0 ]; then
  echo -e "${RED}❌ Faltan $MISSING_VARS variables REQUERIDAS${NC}"
  echo -e "${YELLOW}⚠️  Hay $WEAK_VARS variables con valores débiles o por defecto${NC}"
  echo ""
  echo "📝 Acciones requeridas:"
  echo "1. Copiar .env.example a $ENV_FILE (si no existe)"
  echo "2. Configurar las variables marcadas con ❌"
  echo "3. Generar NEXTAUTH_SECRET con: openssl rand -base64 32"
  echo "4. Volver a ejecutar este script"
  exit 1
else
  echo -e "${YELLOW}⚠️  Hay $WEAK_VARS variables con valores débiles o por defecto${NC}"
  echo ""
  echo "📝 Recomendaciones:"
  echo "1. Reemplazar valores 'your_*' y 'PASSWORD' con valores reales"
  echo "2. Generar NEXTAUTH_SECRET seguro: openssl rand -base64 32"
  exit 0
fi