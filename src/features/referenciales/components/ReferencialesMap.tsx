'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { type LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Supercluster from 'supercluster';
import type { Referencial } from '../lib/api';
import { destinoLabel } from '../lib/destino';
import MapGeocoder from './MapGeocoder';
import './map-markers.css';
import './map-geocoder.css';

interface Props {
  referenciales: Referencial[];
  center?: [number, number];
  zoom?: number;
  onReport?: (r: Referencial) => void;
  /**
   * Callback con el bbox actual del viewport `[minLng, minLat, maxLng, maxLat]`.
   * Se invoca en `moveend`/`zoomend` y en el mount inicial. Solo el consumidor
   * autenticado lo usa (para el filtro "solo área visible").
   */
  onBoundsChange?: (bbox: [number, number, number, number]) => void;
}

type PointProps = { referencial: Referencial };

type SuperclusterFeature = ReturnType<Supercluster<PointProps>['getClusters']>[number];

const PIN_ICON = L.divIcon({
  className: 'inmg-pin-wrapper',
  html: '<span class="inmg-pin"><span class="inmg-pin-halo"></span><span class="inmg-pin-dot"></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10],
});

const SPIDER_PIN_ICON = L.divIcon({
  className: 'inmg-pin-wrapper',
  html: '<span class="inmg-pin inmg-pin--spider"><span class="inmg-pin-halo"></span><span class="inmg-pin-dot"></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10],
});

function buildClusterIcon(count: number, size: number) {
  const sizeClass =
    size >= 64 ? 'inmg-cluster--xl' : size >= 44 ? 'inmg-cluster--lg' : '';
  const label =
    count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : `${count}`;

  return L.divIcon({
    className: 'inmg-cluster-wrapper',
    html: `
      <span class="inmg-cluster ${sizeClass}" style="width:${size}px;height:${size}px">
        <span class="inmg-cluster-ring"></span>
        <span class="inmg-cluster-ring inmg-cluster-ring--delayed"></span>
        <span class="inmg-cluster-body">
          <span class="inmg-cluster-count">${label}</span>
        </span>
      </span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

/** Ajusta el viewport del mapa a los datos cargados */
function FitBounds({ points }: { points: Referencial[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [points, map]);
  return null;
}

interface SpiderfyState {
  clusterId: number;
  center: [number, number]; // [lat, lng]
  leaves: Referencial[];
}

function PointPopupContent({
  r,
  onReport,
}: {
  r: Referencial;
  onReport?: (r: Referencial) => void;
}) {
  const destinoText = destinoLabel(r.destino);

  return (
    <div className="text-sm space-y-1 min-w-[200px]">
      <div className="font-semibold text-gray-900">
        {r.comuna ?? 'Sin comuna'} {r.anio ? `· ${r.anio}` : ''}
      </div>
      {r.predio && <div className="text-gray-700">{r.predio}</div>}
      {r.monto && (
        <div className="text-yellow-700 font-medium">
          {r.monto}
          {typeof r.montoUf === 'number' && (
            <span className="ml-1 text-xs text-yellow-600">
              ({r.montoUf.toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF)
            </span>
          )}
        </div>
      )}
      {(typeof r.superficieTerreno === 'number' ||
        typeof r.superficieConstruida === 'number') && (
        <div className="text-gray-600 text-xs space-y-0.5">
          {typeof r.superficieTerreno === 'number' && (
            <div>Terreno: {r.superficieTerreno.toLocaleString('es-CL')} m²</div>
          )}
          {typeof r.superficieConstruida === 'number' && (
            <div>Construida: {r.superficieConstruida.toLocaleString('es-CL')} m²</div>
          )}
        </div>
      )}
      {destinoText && (
        <div className="text-xs text-gray-600">Destino: {destinoText}</div>
      )}
      {r.rol && <div className="text-xs text-gray-500">ROL: {r.rol}</div>}
      {(r.fojas || r.numero || r.anio) && (
        <div className="text-xs text-gray-500">
          Fojas {r.fojas ?? '—'} · Nº {r.numero ?? '—'} · Año {r.anio ?? '—'}
        </div>
      )}
      {r.cbr && <div className="text-xs text-gray-500">CBR: {r.cbr}</div>}
      {r.fechaescritura && (
        <div className="text-xs text-gray-500">Escritura: {r.fechaescritura}</div>
      )}
      {onReport && (
        <button
          onClick={() => onReport(r)}
          className="mt-2 w-full rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          ⚠ Reportar dato dudoso
        </button>
      )}
    </div>
  );
}

function ClusteredMarkers({
  points,
  onReport,
  onBoundsChange,
}: {
  points: Referencial[];
  onReport?: (r: Referencial) => void;
  onBoundsChange?: (bbox: [number, number, number, number]) => void;
}) {
  const map = useMap();
  const spiderfyRef = useRef<SpiderfyState | null>(null);
  const [spider, setSpider] = useState<SpiderfyState | null>(null);
  spiderfyRef.current = spider;

  const [viewport, setViewport] = useState(() => {
    const b = map.getBounds();
    return {
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [
        number,
        number,
        number,
        number,
      ],
      zoom: Math.round(map.getZoom()),
    };
  });

  // Publica bbox en mount y en cada cambio para el filtro "solo área visible"
  useEffect(() => {
    onBoundsChange?.(viewport.bounds);
  }, [viewport.bounds, onBoundsChange]);

  useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      setViewport({
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        zoom: Math.round(map.getZoom()),
      });
      if (spiderfyRef.current) setSpider(null);
    },
    zoomstart: () => {
      if (spiderfyRef.current) setSpider(null);
    },
    click: () => {
      if (spiderfyRef.current) setSpider(null);
    },
  });

  const supercluster = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: 60, maxZoom: 16 });
    sc.load(
      points.map((r) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [r.lng, r.lat] as [number, number],
        },
        properties: { referencial: r },
      }))
    );
    return sc;
  }, [points]);

  const clusters = useMemo(
    () => supercluster.getClusters(viewport.bounds, viewport.zoom),
    [supercluster, viewport]
  );

  // Cuando el dataset cambia, descartamos cualquier spiderfy vigente
  useEffect(() => {
    setSpider(null);
  }, [points]);

  const handleClusterClick = (
    clusterId: number,
    count: number,
    lat: number,
    lng: number
  ) => {
    const expansionZoom = supercluster.getClusterExpansionZoom(clusterId);
    const currentZoom = Math.round(map.getZoom());
    const canZoomMore = expansionZoom > currentZoom;

    // Si el cluster es pequeño Y ya no podemos dividirlo por zoom, spiderfy.
    if (count <= 10 && !canZoomMore) {
      const leavesFeatures = supercluster.getLeaves(
        clusterId,
        Infinity
      ) as Array<SuperclusterFeature>;
      const leaves = leavesFeatures
        .map((f) => (f.properties as PointProps).referencial)
        .filter(Boolean);
      setSpider({ clusterId, center: [lat, lng], leaves });
      return;
    }

    // Normal: hace flyTo al nivel donde el cluster se divide
    map.flyTo([lat, lng], Math.min(expansionZoom, 18), {
      animate: true,
      duration: 0.5,
    });
  };

  const spiderPins = useMemo(() => {
    if (!spider) return [];
    const centerPt = map.latLngToContainerPoint(
      L.latLng(spider.center[0], spider.center[1])
    );
    const baseRadius = 44; // px
    const extraPerExtra = 6; // px por leaf > 4
    const radius = baseRadius + Math.max(0, spider.leaves.length - 4) * extraPerExtra;
    const angleStep = (2 * Math.PI) / spider.leaves.length;

    return spider.leaves.map((r, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const pt = L.point(
        centerPt.x + Math.cos(angle) * radius,
        centerPt.y + Math.sin(angle) * radius
      );
      const latLng = map.containerPointToLatLng(pt);
      return {
        r,
        lat: latLng.lat,
        lng: latLng.lng,
      };
    });
  }, [spider, map]);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as Record<string, unknown>;
        const isCluster = Boolean(props.cluster);

        if (isCluster) {
          const count = props.point_count as number;
          const clusterId = props.cluster_id as number;

          // Si este cluster está spiderficado, lo ocultamos (los leaves lo reemplazan)
          if (spider?.clusterId === clusterId) return null;

          const size = Math.min(32 + Math.sqrt(count) * 3.2, 72);
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={buildClusterIcon(count, Math.round(size))}
              eventHandlers={{
                click: (e: LeafletMouseEvent) => {
                  L.DomEvent.stopPropagation(e);
                  handleClusterClick(clusterId, count, lat, lng);
                },
              }}
            />
          );
        }

        const r = (props as PointProps).referencial;
        return (
          <Marker key={r.id} position={[lat, lng]} icon={PIN_ICON}>
            <Popup>
              <PointPopupContent r={r} onReport={onReport} />
            </Popup>
          </Marker>
        );
      })}

      {/* Spiderfy overlay */}
      {spider &&
        spiderPins.map((sp, i) => (
          <Polyline
            key={`leg-${spider.clusterId}-${i}`}
            positions={[spider.center, [sp.lat, sp.lng]]}
            pathOptions={{
              color: '#ca8a04',
              weight: 1.5,
              opacity: 0.75,
              dashArray: '3 3',
            }}
            interactive={false}
          />
        ))}
      {spider &&
        spiderPins.map((sp) => (
          <Marker
            key={`spider-${sp.r.id}`}
            position={[sp.lat, sp.lng]}
            icon={SPIDER_PIN_ICON}
          >
            <Popup>
              <PointPopupContent r={sp.r} onReport={onReport} />
            </Popup>
          </Marker>
        ))}
    </>
  );
}

export default function ReferencialesMap({
  referenciales,
  center = [-33.4489, -70.6693],
  zoom = 10,
  onReport,
  onBoundsChange,
}: Props) {
  const valid = useMemo(
    () => referenciales.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng)),
    [referenciales]
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &middot; datos: CBR Chile'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={valid} />
      <MapGeocoder />
      <ClusteredMarkers
        points={valid}
        onReport={onReport}
        onBoundsChange={onBoundsChange}
      />
    </MapContainer>
  );
}
