import React from "react";
import { IconInfo, IconAlert } from "./icons.jsx";

const TONES = {
  info: { box: "border-accent/20 bg-accent-soft text-accent-dark", Icon: IconInfo },
  warning: { box: "border-amber-300/60 bg-status-dueBg text-status-dueText", Icon: IconAlert },
};

/** Notice from Love Realty shown on the client's dashboard (and as a live preview in Settings). */
export default function AnnouncementBanner({ message, tone = "info" }) {
  const { box, Icon } = TONES[tone] || TONES.info;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${box}`}>
      <Icon width={18} height={18} className="mt-0.5 flex-shrink-0" />
      <p className="whitespace-pre-line leading-relaxed">{message}</p>
    </div>
  );
}
