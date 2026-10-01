import React from "react";
import { IconSearch } from "./icons.jsx";

export default function EmptyState({
  title = "Nothing here yet",
  body = "Once records are added, they'll show up in this list.",
  icon: Icon = IconSearch,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center text-gray-400">
      <Icon className="text-gray-300" width={28} height={28} />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="max-w-xs text-xs">{body}</p>
    </div>
  );
}
