import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Incident } from '@/lib/auth';
import 'leaflet/dist/leaflet.css';

const redIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface IncidentMapProps {
  incidents: Incident[];
}

const IncidentMap = ({ incidents }: IncidentMapProps) => {
  const center = incidents.length > 0
    ? [incidents[0].latitude, incidents[0].longitude] as [number, number]
    : [28.6139, 77.2090] as [number, number];

  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ height: 300 }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map(inc => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            icon={inc.status === 'resolved' ? greenIcon : redIcon}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{inc.victimName}</p>
                <p>{inc.incidentType}</p>
                <p className="capitalize">{inc.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
