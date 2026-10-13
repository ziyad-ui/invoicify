import React, { useEffect, useRef } from "react";
import { L, addTiles, pinIcon, PIN_ZOOM } from "./mapUtils.js";

/**
 * Read-only interactive map with one custom marker (Leaflet + OpenStreetMap).
 * Zoom with the +/- buttons, double-click or pinch. The scroll wheel only zooms after the map is clicked,
 * so scrolling past the map on a normal page doesn't get "stuck" on it.
 */
export default function PropertyMap({ latitude, longitude, title, className = "h-80 lg:h-full min-h-[18rem]" }) {
  const el = useRef(null);

  useEffect(() => {
    const at = [Number(latitude), Number(longitude)];
    const map = L.map(el.current, { center: at, zoom: PIN_ZOOM, scrollWheelZoom: false });
    addTiles(map);

    const marker = L.marker(at, { icon: pinIcon(), title: title || "Property location" }).addTo(map);
    if (title) marker.bindPopup(`<strong>${escapeHtml(title)}</strong>`).openPopup();

    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => {
      clearTimeout(t);
      map.remove();
    };
  }, [latitude, longitude, title]);

  return (
    <div className="isolate h-full overflow-hidden rounded-xl">
      <div ref={el} className={`w-full ${className}`} role="application" aria-label="Map showing your property location" />
    </div>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
