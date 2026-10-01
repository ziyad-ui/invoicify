import React from "react";

// Small, consistent 18px stroke icon set used across the app.
// Kept as plain SVG (no icon-library dependency) so the project has the
// fewest possible moving parts before the backend phase begins.

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconDashboard = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconClients = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17.5" cy="9" r="2.3" />
    <path d="M21 20c0-2.5-1.6-4.3-3.8-4.9" />
  </svg>
);

export const IconInvoice = (p) => (
  <svg {...base} {...p}>
    <path d="M6 2.5h9l3 3V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
);

export const IconPayments = (p) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="6" width="19" height="13" rx="2" />
    <path d="M2.5 10.5h19" />
    <path d="M6 15h4" />
  </svg>
);

export const IconBell = (p) => (
  <svg {...base} {...p}>
    <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </svg>
);

export const IconReports = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20V10M11 20V4M18 20v-7" />
    <path d="M2.5 20h19" />
  </svg>
);

export const IconLogout = (p) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconPlus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconEdit = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20.5h4L19.5 9a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L4 15.5v5Z" />
  </svg>
);

export const IconTrash = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    <path d="M6 7l1 13.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
  </svg>
);

export const IconEye = (p) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const IconChevronRight = (p) => (
  <svg {...base} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconClose = (p) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconCheck = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12.5l5 5L20 7" />
  </svg>
);

export const IconDownload = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 20.5h16" />
  </svg>
);

export const IconHome = (p) => (
  <svg {...base} {...p}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v10.5h12V10" />
  </svg>
);

export const IconAlert = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 22 20.5H2Z" />
    <path d="M12 10v4" />
    <path d="M12 17.2v.1" />
  </svg>
);
