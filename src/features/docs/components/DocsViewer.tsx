'use client';

import { useState } from 'react';
import { DocsSidebar } from './DocsSidebar';
import { DocsContent } from './DocsContent';
import type { DocItem } from '@/shared/types/docs';

const DOCS_STRUCTURE: DocItem[] = [
  {
    id: 'introduccion',
    title: '🚀 Introducción',
    path: '01-introduccion',
    children: [
      { id: 'introduccion-index', title: 'Visión General', path: '01-introduccion/index' },
      { id: 'arquitectura-general', title: 'Arquitectura General', path: '01-introduccion/arquitectura-general' },
      { id: 'tecnologias', title: 'Stack Tecnológico', path: '01-introduccion/tecnologias' }
    ]
  },
  {
    id: 'desarrollo',
    title: '💻 Desarrollo',
    path: '02-desarrollo',
    children: [
      { id: 'desarrollo-index', title: 'Guía de Desarrollo', path: '02-desarrollo/index' }
    ]
  },
  {
    id: 'arquitectura',
    title: '🏗️ Arquitectura',
    path: '03-arquitectura',
    children: [
      { id: 'autenticacion', title: 'Autenticación', path: '03-arquitectura/autenticacion' },
      { id: 'base-datos', title: 'Base de Datos', path: '03-arquitectura/base-datos' },
      { id: 'estructura-proyecto', title: 'Estructura del Proyecto', path: '03-arquitectura/estructura-proyecto' }
    ]
  },
  // Removed: API section (legacy docs api-publica, integraciones archived)
  {
    id: 'modulos',
    title: '📊 Módulos',
    path: '05-modulos',
    children: [
      // Removed: 'referenciales' (archived to legacy-docs)
      { id: 'estadisticas-avanzadas', title: 'Estadísticas Avanzadas', path: '05-modulos/estadisticas-avanzadas' },
      { id: 'mapa-interactivo', title: 'Mapa Interactivo', path: '05-modulos/mapa-interactivo' },
      { id: 'chatbot', title: 'Chatbot', path: '05-modulos/chatbot' }
    ]
  },
  {
    id: 'deployment',
    title: '🚀 Deployment',
    path: '06-deployment',
    children: [
      { id: 'deployment-index', title: 'Guía de Despliegue', path: '06-deployment/index' }
    ]
  },
  {
    id: 'mantenimiento',
    title: '🔧 Mantenimiento',
    path: '07-maintenance',
    children: [
      { id: 'soluciones-comunes', title: 'Soluciones Comunes', path: '07-maintenance/soluciones-comunes' }
    ]
  },
  {
    id: 'recursos',
    title: '📚 Recursos',
    path: '08-resources',
    children: [
      { id: 'cookies-compliance', title: 'Cookies & Compliance', path: '08-resources/cookies-compliance' },
      { id: 'github-automation', title: 'GitHub Automation', path: '08-resources/github-automation' },
      { id: 'roles-permisos', title: 'Roles y Permisos', path: '08-resources/roles-permisos' }
    ]
  }
];

export function DocsViewer() {
  const [selectedDoc, setSelectedDoc] = useState('introduccion-index');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DocsSidebar
        structure={DOCS_STRUCTURE}
        selectedDoc={selectedDoc}
        onDocSelect={setSelectedDoc}
      />
      <DocsContent selectedDoc={selectedDoc} />
    </div>
  );
}