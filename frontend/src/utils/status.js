// Central place mapping a status string to a visual tone.
// Keeps StatusBadge dumb and every page consistent.
export const STATUS_TONE = {
  Overdue: "overdue",
  "Due Soon": "due",
  Current: "ok",
  "Fully Paid": "paid",
  Paid: "paid",
  Pending: "due",
  Failed: "overdue",
  Sent: "ok",
  Verified: "ok",
  Upcoming: "neutral",
  Active: "ok",
  Deactivated: "overdue",
};

export function toneFor(status) {
  return STATUS_TONE[status] || "neutral";
}
