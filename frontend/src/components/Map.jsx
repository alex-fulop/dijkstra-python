import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function Map({ nodes, selectedPath }) {
  const center = [45.9432, 24.9668]; // Center of Romania

  return (
    <MapContainer 
      center={center} 
      zoom={7} 
      style={{ 
        height: '100%', 
        width: '100%',
        zIndex: 1 
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {Object.entries(nodes).map(([name, [lat, lng]]) => (
        <Marker key={name} position={[lat, lng]}>
          <Popup>{name}</Popup>
        </Marker>
      ))}
      {selectedPath && (
        <Polyline
          positions={selectedPath.map(node => nodes[node])}
          color="red"
        />
      )}
    </MapContainer>
  );
}

export default Map; 