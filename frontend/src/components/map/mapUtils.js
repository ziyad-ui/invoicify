import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Shared Leaflet + OpenStreetMap helpers. No API key and no paid service:
 *  - map tiles come from the public OpenStreetMap tile server
 *  - address search / reverse lookup use OpenStreetMap's free Nominatim service
 * (Nominatim's usage policy allows light use: search only when the user asks, never on every keystroke.)
 */
export { L };

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Where an empty map opens: Tagum City, Davao del Norte.
export const DEFAULT_CENTER = [7.4478, 125.8078];
export const DEFAULT_ZOOM = 12;
export const PIN_ZOOM = 17;

/** Custom pin drawn with inline SVG, so no marker image files need to be bundled. */
export function pinIcon() {
  return L.divIcon({
    className: "invoicify-pin",
    html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 45C18 45 33 29.5 33 17A15 15 0 0 0 3 17C3 29.5 18 45 18 45Z" fill="#4F46E5" stroke="#fff" stroke-width="2.5"/>
      <circle cx="18" cy="17" r="6" fill="#fff"/>
    </svg>`,
    iconSize: [36, 46],
    iconAnchor: [18, 45],
    popupAnchor: [0, -42],
  });
}

export function addTiles(map) {
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
}

/** 7.447800, 125.807800 -> "7.447800° N, 125.807800° E" */
export function formatCoordinates(lat, lng) {
  if (lat == null || lng == null || lat === "" || lng === "") return "—";
  const la = Number(lat);
  const lo = Number(lng);
  return `${Math.abs(la).toFixed(6)}° ${la >= 0 ? "N" : "S"}, ${Math.abs(lo).toFixed(6)}° ${lo >= 0 ? "E" : "W"}`;
}

export function osmLink(lat, lng, zoom = 18) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

/** Address / area search (Philippines first). Resolves to [{ label, lat, lng }]. */
export async function searchPlaces(query, signal) {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=6&countrycodes=ph&addressdetails=0&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Search is unavailable right now.");
  const rows = await res.json();
  return rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}

/** Coordinates -> a readable address string ("" when nothing is found). */
export async function reverseGeocode(lat, lng, signal) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) return "";
  const row = await res.json();
  return row?.display_name || "";
}
