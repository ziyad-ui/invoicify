import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PropertyMap from "../../components/map/PropertyMap.jsx";
import { formatCoordinates, osmLink } from "../../components/map/mapUtils.js";
import { IconMapPin, IconHome, IconCheck } from "../../components/icons.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency } from "../../utils/format.js";

function Row({ label, children }) {
  return (
    <div className="py-3.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

export default function PortalProperty() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your property…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const p = client.property || {};
  const hasPin = p.latitude != null && p.longitude != null;
  const coords = formatCoordinates(p.latitude, p.longitude);

  async function copyCoords() {
    try {
      await navigator.clipboard.writeText(`${p.latitude}, ${p.longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard can be blocked on non-https pages; the coordinates are still shown on screen */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Property location & details" subtitle="Where your property is and how to get there." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Map */}
        <div className="lg:col-span-3">
          <div className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
            {hasPin ? (
              <PropertyMap latitude={p.latitude} longitude={p.longitude} title={p.name} />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-lg bg-gray-50 px-6 lg:h-full">
                <EmptyState
                  icon={IconMapPin}
                  title="Location not pinned yet"
                  body="Your property's exact map location hasn't been added. Please ask your Love Realty account officer to pin it."
                />
              </div>
            )}
          </div>
        </div>

        {/* Overview card */}
        <Card className="lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <IconHome width={22} height={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-snug text-ink">{p.name || "—"}</h2>
              <span className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-dark">
                {p.type || "Property"}
              </span>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
            <Row label="Full address / phase & block">
              {p.address ? p.address : <span className="text-gray-400">Not provided yet</span>}
            </Row>

            <Row label="Exact coordinates">
              {hasPin ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="num">{coords}</span>
                  <button type="button" onClick={copyCoords} className="text-xs font-medium text-accent hover:underline">
                    {copied ? (
                      <span className="inline-flex items-center gap-1">
                        <IconCheck width={12} height={12} /> Copied
                      </span>
                    ) : (
                      "Copy"
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">Not pinned yet</span>
              )}
            </Row>

            <Row label="Landmark / access directions & community notes">
              {p.locationNotes ? (
                <p className="whitespace-pre-line leading-relaxed text-gray-700">{p.locationNotes}</p>
              ) : (
                <span className="text-gray-400">No directions have been added yet.</span>
              )}
            </Row>

            <Row label="Total contract price">
              <span className="num">{formatCurrency(p.totalPrice || 0)}</span>
            </Row>
          </dl>

          {hasPin && (
            <a
              href={osmLink(p.latitude, p.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-ink hover:bg-gray-50"
            >
              <IconMapPin width={16} height={16} /> Open in OpenStreetMap
            </a>
          )}
        </Card>
      </div>
    </div>
  );
}
