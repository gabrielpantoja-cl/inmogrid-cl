'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PIN_ICON = L.divIcon({
  className: 'inmg-pin-wrapper',
  html: '<span class="inmg-pin"><span class="inmg-pin-halo"></span><span class="inmg-pin-dot"></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10],
});

interface Props {
  lat: number;
  lng: number;
  label?: string;
}

export default function ReportMap({ lat, lng, label }: Props) {
  return (
    <div className="w-full h-[250px] rounded-md border overflow-hidden print:h-[300px]">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={PIN_ICON}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}
