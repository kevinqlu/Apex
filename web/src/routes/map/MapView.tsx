import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Position, Stop } from '../../api/tracking';

interface Props {
  origin: Stop;
  destination: Stop;
  position: Position | null;
  progress: number;
  onTilesFailed: () => void;
}

// The arrow glyph points east, so subtract 90 degrees from a compass heading.
const truckIcon = (headingDeg: number) =>
  L.divIcon({
    className: 'truck-marker',
    html: `<span style="transform: rotate(${headingDeg - 90}deg)">&#10148;</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

// Markers are drawn without image files, so the route still shows if map pictures fail to load.
export function MapView({ origin, destination, position, progress, onTilesFailed }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const truck = useRef<L.Marker | null>(null);
  const lastProgress = useRef(0);
  const failed = useRef(onTilesFailed);
  failed.current = onTilesFailed;

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    });
    tiles.on('tileerror', () => failed.current());
    tiles.addTo(m);

    const from: L.LatLngTuple = [origin.lat, origin.lng];
    const to: L.LatLngTuple = [destination.lat, destination.lng];
    L.polyline([from, to], { color: '#0e6b4a', weight: 4, dashArray: '8 8' }).addTo(m);
    L.circleMarker(from, { radius: 8, color: '#0e6b4a', fillColor: '#ffffff', fillOpacity: 1 })
      .bindTooltip(origin.city, { permanent: true, direction: 'top' })
      .addTo(m);
    L.circleMarker(to, { radius: 8, color: '#0e6b4a', fillColor: '#0e6b4a', fillOpacity: 1 })
      .bindTooltip(destination.city, { permanent: true, direction: 'top' })
      .addTo(m);
    m.fitBounds(L.latLngBounds([from, to]), { padding: [40, 40] });

    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      truck.current = null;
    };
  }, [origin.lat, origin.lng, origin.city, destination.lat, destination.lng, destination.city]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!position) {
      truck.current?.remove();
      truck.current = null;
      return;
    }
    const at: L.LatLngTuple = [position.lat, position.lng];
    if (truck.current) {
      // The truck glides between updates, except when the demo loops it back to the start.
      const el = truck.current.getElement();
      const looped = progress < lastProgress.current - 0.2;
      if (el && looped) el.style.transition = 'none';
      truck.current.setLatLng(at).setIcon(truckIcon(position.headingDeg));
      if (el && looped) {
        void el.offsetWidth;
        el.style.transition = '';
      }
    } else {
      truck.current = L.marker(at, { icon: truckIcon(position.headingDeg), keyboard: false }).addTo(
        m,
      );
    }
    lastProgress.current = progress;
  }, [position, progress]);

  return (
    <div
      ref={box}
      className="map-box"
      role="application"
      aria-label="Map of your route. The same information is written out below the map."
    />
  );
}
