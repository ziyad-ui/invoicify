import React from "react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

/** Yes/No confirmation used before destructive actions (archive, delete). `danger` makes the confirm button red. */
export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-600">{children}</div>
    </Modal>
  );
}
