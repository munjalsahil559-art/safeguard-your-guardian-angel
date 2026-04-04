import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
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

const pulsingIcon = new DivIcon({
  className: '',
  html: `<div style="position:relative;width:30px;height:30px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.4);animation:sos-pulse 1s ease-in-out infinite;"></div>
    <div style="position:absolute;top:5px;left:5px;width:20px;height:20px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 8px rgba(239,68,68,0.8);"></div>
  </div>
  <style>@keyframes sos-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.8);opacity:0.3}}</style>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

interface IncidentMapProps {
  incidents: Incident[];
  onIncidentClick?: (incident: Incident) => void;
}

const IncidentMap = ({ incidents, onIncidentClick }: IncidentMapProps) => {
  const center = incidents.length > 0
    ? [incidents[0].latitude, incidents[0].longitude] as [number, number]
    : [28.6139, 77.2090] as [number, number];

  const getIcon = (inc: Incident) => {
    if (inc.sosActive) return pulsingIcon;
    return inc.status === 'resolved' ? greenIcon : redIcon;
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ height: 350 }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map(inc => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            icon={getIcon(inc)}
            eventHandlers={{
              click: () => onIncidentClick?.(inc),
            }}
          >
            <Popup>
              <div className="text-xs min-w-[200px]">
                <p className="font-bold text-sm mb-1">{inc.victimName}</p>
                {inc.sosActive && (
                  <p className="text-red-600 font-bold mb-1">🚨 ACTIVE SOS</p>
                )}
                <div className="space-y-0.5">
                  <p><span className="font-semibold">Type:</span> {inc.incidentType}</p>
                  <p><span className="font-semibold">Status:</span> <span className="capitalize">{inc.status}</span></p>
                  <p><span className="font-semibold">Time:</span> {new Date(inc.time).toLocaleString()}</p>
                  <p><span className="font-semibold">Reporter:</span> {inc.reportedBy}</p>
                  {inc.description && (
                    <p><span className="font-semibold">Description:</span> {inc.description}</p>
                  )}
                  {inc.evidence && inc.evidence.length > 0 && (
                    <p><span className="font-semibold">Evidence:</span> {inc.evidence.length} item(s)</p>
                  )}
                  {inc.actionTaken && (
                    <p><span className="font-semibold">Action:</span> {inc.actionTaken}</p>
                  )}
                </div>
                <p className="mt-1">
                  <a
                    href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-[10px]"
                  >
                    Open in Google Maps
                  </a>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
