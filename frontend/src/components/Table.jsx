import React from "react";
import LoadingState from "./LoadingState.jsx";
import EmptyState from "./EmptyState.jsx";

/**
 * columns: [{ key, header, render?(row), className? }]
 * rows: array of data objects (must include a unique `id` or `key`)
 */
export default function Table({ columns, rows, loading, emptyTitle, emptyBody, rowKey = "id" }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            {columns.map((col) => (
              <th key={col.key} className={`px-2 py-3 ${col.className || ""}`}>
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
              <tr
                key={row[rowKey]}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-2 py-3.5 align-middle ${col.className || ""}`}>
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
