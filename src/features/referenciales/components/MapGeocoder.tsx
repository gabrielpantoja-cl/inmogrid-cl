'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

/**
 * Añade un buscador por dirección al mapa de Leaflet.
 *
 * Implementación: `leaflet-geosearch` + `OpenStreetMapProvider` (Nominatim
 * gratis, sin API key). Para evitar abusos al API público de Nominatim:
 *   - Resultados restringidos a Chile (`countrycodes: 'cl'`).
 *   - Sin autocomplete-as-you-type por default — el usuario confirma con
 *     Enter o click en la lupa.
 *   - Sin persistir el marker del resultado (se auto-oculta tras moverse).
 *
 * Si en el futuro el tráfico justifica dejar Nominatim (o si queremos
 * autocomplete agresivo / mejor precisión rural), se puede migrar al
 * MapboxProvider de la misma librería pasando un token. Ver ADR futuro.
 */
export default function MapGeocoder() {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider({
      params: {
        countrycodes: 'cl',
        'accept-language': 'es',
        addressdetails: 1,
      },
    });

    const control = GeoSearchControl({
      provider,
      style: 'bar',
      position: 'topright',
      searchLabel: 'Buscar dirección en Chile…',
      notFoundMessage: 'Sin resultados para esa dirección.',
      autoClose: true,
      keepResult: false,
      showMarker: true,
      marker: {
        icon: L.divIcon({
          className: 'inmg-pin-wrapper',
          html: '<span class="inmg-pin"><span class="inmg-pin-halo"></span><span class="inmg-pin-dot"></span></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      },
      showPopup: false,
      retainZoomLevel: false,
      animateZoom: true,
    });

    // Los tipos de leaflet-geosearch no calzan 100% con L.Control — el
    // cast a unknown evita quejarse por la firma pero runtime es correcto.
    map.addControl(control as unknown as L.Control);

    return () => {
      map.removeControl(control as unknown as L.Control);
    };
  }, [map]);

  return null;
}
