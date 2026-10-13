import React, { useEffect, useRef, useState } from "react";
import FormField from "../FormField.jsx";
import Button from "../Button.jsx";
import { IconSearch, IconClose } from "../icons.jsx";
import {
  L,
  addTiles,
  pinIcon,
  searchPlaces,
  reverseGeocode,
  formatCoordinates,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  PIN_ZOOM,
} from "./mapUtils.js";

/**
 * Optional "drop a pin" control for the Add / Edit Client form.
 * Staff can search for an address or area, click the map, or drag the pin.
 *
 *  value    { latitude, longitude, address, locationNotes }  (latitude / longitude: number or "")
 *  onChange (patch) => void   - merges the changed fields into the parent form
 */
export default function LocationPicker({ value, onChange, errors = {} }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const addressRef = useRef(value.address);
  const onChangeRef = useRef(onChange);
  const lookupRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Keep the latest callbacks / values available to the map's event handlers.
  onChangeRef.current = onChange;
  addressRef.current = value.address;

  const hasPin = value.latitude !== "" && value.latitude != null && value.longitude !== "" && value.longitude != null;

  /** Move (or create) the pin and report the new coordinates. */
  function placePin(lat, lng, { pan = false, lookupAddress = false } = {}) {
    const map = mapRef.current;
    if (!map) return;
    const at = [lat, lng];

    if (!markerRef.current) {
      const marker = L.marker(at, { icon: pinIcon(), draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        commit(p.lat, p.lng, true);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(at);
    }
    if (pan) map.setView(at, Math.max(map.getZoom(), PIN_ZOOM));
    commit(lat, lng, lookupAddress);
  }

  function commit(lat, lng, lookupAddress) {
    const patch = { latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) };
    onChangeRef.current(patch);

    // Fill the address from the pin, but never overwrite something the staff member typed.
    if (lookupAddress && !addressRef.current?.trim()) {
      lookupRef.current?.abort();
      const ctrl = new AbortController();
      lookupRef.current = ctrl;
      reverseGeocode(lat, lng, ctrl.signal)
        .then((label) => {
          if (label && !addressRef.current?.trim()) onChangeRef.current({ address: label.slice(0, 255) });
        })
        .catch(() => {});
    }
  }

  // Build the map once.
  useEffect(() => {
    const hasStart = value.latitude !== "" && value.latitude != null && value.longitude !== "" && value.longitude != null;
    const map = L.map(mapEl.current, {
      center: hasStart ? [Number(value.latitude), Number(value.longitude)] : DEFAULT_CENTER,
      zoom: hasStart ? PIN_ZOOM : DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });
    addTiles(map);
    mapRef.current = map;

    if (hasStart) placePin(Number(value.latitude), Number(value.longitude));
    map.on("click", (e) => placePin(e.latlng.lat, e.latlng.lng, { lookupAddress: true }));

    // The map is created inside a modal that has just opened: re-measure once it has its final size.
    const t = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(t);
      lookupRef.current?.abort();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(e) {
    e?.preventDefault();
    if (query.trim().length < 3) {
      setSearchError("Type at least 3 characters.");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const rows = await searchPlaces(query.trim());
      setResults(rows);
      if (rows.length === 0) setSearchError("No matches found. Try a nearby landmark, barangay or city, or click the map.");
    } catch {
      setSearchError("Search is unavailable right now. You can still click the map to drop a pin.");
    } finally {
      setSearching(false);
    }
  }

  function choose(r) {
    setResults([]);
    setQuery(r.label);
    placePin(r.lat, r.lng, { pan: true });
    if (!value.address?.trim()) onChange({ address: r.label.slice(0, 255) });
  }

  function clearPin() {
    markerRef.current?.remove();
    markerRef.current = null;
    onChange({ latitude: "", longitude: "" });
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <form onSubmit={runSearch} className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search an address, subdivision or area…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <Button type="submit" variant="outline" loading={searching}>
            Search
          </Button>
        </form>

        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg scrollbar-thin">
            {results.map((r, i) => (
              <li key={`${r.lat}-${r.lng}-${i}`}>
                <button type="button" onClick={() => choose(r)} className="block w-full px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-ink">
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchError && <p className="mt-1.5 text-xs text-amber-700">{searchError}</p>}
      </div>

      {/* `isolate` keeps Leaflet's internal z-indexes from escaping above the modal. */}
      <div className="isolate overflow-hidden rounded-xl border border-gray-200">
        <div ref={mapEl} className="h-64 w-full sm:h-72" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className={hasPin ? "num font-medium text-ink" : "text-gray-400"}>
          {hasPin ? formatCoordinates(value.latitude, value.longitude) : "Click the map to drop a pin. You can drag it to fine-tune."}
        </p>
        {hasPin && (
          <button type="button" onClick={clearPin} className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline">
            <IconClose width={12} height={12} /> Remove pin
          </button>
        )}
      </div>
      {(errors.latitude || errors.longitude) && <p className="text-xs text-red-600">{errors.latitude || errors.longitude}</p>}

      <FormField
        label="Full address / phase & block"
        placeholder="e.g. Greenfield Homes, Phase 2 Block 5 Lot 4, Visayan Village, Tagum City"
        maxLength={255}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        error={errors.address}
      />
      <FormField
        as="textarea"
        rows={3}
        label="Landmark / access directions (optional)"
        placeholder="e.g. Beside the barangay hall, turn right at the clubhouse. Visitors register at the guard house."
        maxLength={2000}
        value={value.locationNotes}
        onChange={(e) => onChange({ locationNotes: e.target.value })}
        error={errors.locationNotes}
      />
    </div>
  );
}
