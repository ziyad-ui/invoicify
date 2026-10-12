import React from "react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";

const VERSION = "2.0";

export default function AboutModal({ open, onClose }) {
  const { t } = usePreferences();

  return (
    <Modal open={open} onClose={onClose} title={t("about.title")} footer={<Button onClick={onClose}>{t("common.close")}</Button>}>
      <div className="space-y-4 text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">IN</span>
          <div>
            <p className="font-semibold text-ink">Invoicify</p>
            <p className="text-xs text-gray-500">{t("about.tagline")}</p>
          </div>
        </div>
        <p>{t("about.body1")}</p>
        <p>{t("about.body2")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("about.owner")}</li>
          <li>{t("about.staff")}</li>
          <li>{t("about.client")}</li>
        </ul>
        <p className="text-xs text-gray-400">{t("about.version", { version: VERSION })}</p>
      </div>
    </Modal>
  );
}
