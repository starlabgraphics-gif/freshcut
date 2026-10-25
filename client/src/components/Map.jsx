import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const NAIROBI = [-1.2864, 36.8172];

function makeIcon(kind, emoji = '✂️') {
  return L.divIcon({
    className: '',
    html: `<div class="map-dot ${kind}">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function addTiles(map) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    className: 'leaflet-dark-tiles',
  }).addTo(map);
}

// ---------------------------------------------------------------- map of many shops
export function ShopMap({ shops = [], me, height = 420, onSelect }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView(NAIROBI, 12);
    addTiles(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts = [];
    shops.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const kind = !s.is_open ? 'closed' : s.is_busy ? 'busy' : 'free';
      const marker = L.marker([s.lat, s.lng], { icon: makeIcon(kind) });
      const wait = !s.is_open ? 'Offline' : s.is_busy ? `Next slot ${s.est_wait_minutes} min` : 'Chair free now';
      marker.bindPopup(
        `<div><strong>${s.name}</strong><br/><span style="color:#8B96A9">${s.area || ''}</span><br/><span>${wait} · ${s.queue_count} in queue</span></div>`
      );
      marker.on('click', () => onSelect && onSelect(s));
      marker.addTo(layer);
      pts.push([s.lat, s.lng]);
    });
    if (me && me.lat != null && me.lng != null) {
      L.marker([me.lat, me.lng], { icon: makeIcon('me', '📍') })
        .bindPopup('<div><strong>You are here</strong></div>')
        .addTo(layer);
      pts.push([me.lat, me.lng]);
    }
    if (!fitted.current && pts.length) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15));
      fitted.current = true;
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [shops, me?.lat, me?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={ref} style={{ height }} className="w-full rounded-2xl border border-ink-700 shadow-card z-0" />;
}

// ---------------------------------------------------------------- pick a location
export function MapPicker({ value, onChange, height = 300, hint }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (mapRef.current) return;
    const start = value && value.lat != null ? [value.lat, value.lng] : NAIROBI;
    const map = L.map(ref.current).setView(start, value && value.lat != null ? 15 : 12);
    addTiles(map);
    map.on('click', (e) => {
      onChangeRef.current && onChangeRef.current({ lat: round6(e.latlng.lat), lng: round6(e.latlng.lng) });
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value && value.lat != null && value.lng != null) {
      if (!markerRef.current) {
        markerRef.current = L.marker([value.lat, value.lng], { icon: makeIcon('me', '📌'), draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const ll = markerRef.current.getLatLng();
          onChangeRef.current && onChangeRef.current({ lat: round6(ll.lat), lng: round6(ll.lng) });
        });
      } else {
        const cur = markerRef.current.getLatLng();
        if (cur.lat !== value.lat || cur.lng !== value.lng) markerRef.current.setLatLng([value.lat, value.lng]);
      }
    }
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div ref={ref} style={{ height }} className="w-full rounded-2xl border border-ink-700 shadow-card overflow-hidden z-0" />
      <p className="mt-2 text-xs text-muted flex items-center gap-1.5">
        <span className="text-gold-400">◉</span> {hint || 'Click the map (or drag the pin) to set the exact spot.'}
        {value?.lat != null && <span className="ml-auto font-mono text-muted-dark">{value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>}
      </p>
    </div>
  );
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;
