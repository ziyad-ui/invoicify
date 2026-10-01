import React from "react";
import { toneFor } from "../utils/status.js";

const TONE_CLASSES = {
  overdue: "bg-status-overdueBg text-status-overdueText",
  due: "bg-status-dueBg text-status-dueText",
  ok: "bg-status-okBg text-status-okText",
  paid: "bg-status-paidBg text-status-paidText",
  neutral: "bg-gray-100 text-gray-600",
};

export default function StatusBadge({ status }) {
  const tone = toneFor(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {status}
    </span>
  );
}
