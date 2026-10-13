import React from "react";
import LoadingState from "./LoadingState.jsx";
import EmptyState from "./EmptyState.jsx";

/**
 * columns: [{ key, header, render?(row), className? }]
 * rows: array of data objects (must include a unique `id` or `key`)
 * flush: edge-to-edge look for use inside <Card flush> (shaded header, roomier cells)
 * maxHeight: optional CSS height (e.g. "26rem"); the body scrolls inside it and the header stays pinned.
 */
export default function Table({ columns, rows, loading, emptyTitle, emptyBody, rowKey = "id", maxHeight, flush = false }) {
  return (
    <div
      className={`overflow-x-auto scrollbar-thin ${maxHeight ? "overflow-y-auto" : ""}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className={`border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500 ${flush ? "border-t bg-gray-50" : ""}`}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${flush ? "px-4 first:pl-5 last:pr-5" : "px-2"} py-3 ${maxHeight ? "sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_rgba(128,128,128,0.25)]" : ""} ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-10">
                <LoadingState />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10">
                <EmptyState title={emptyTitle} body={emptyBody} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[rowKey]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className={`${flush ? "px-4 first:pl-5 last:pr-5" : "px-2"} py-3.5 align-middle ${col.className || ""}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
