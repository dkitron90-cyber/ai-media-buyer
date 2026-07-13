import { useState } from 'react';

interface ConfirmButtonProps {
  label: string;
  confirmLabel?: string;
  className?: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
}

export const ConfirmButton = ({
  label,
  confirmLabel = 'Confirm',
  className = '',
  onConfirm,
  disabled,
}: ConfirmButtonProps) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (disabled || busy) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (busy) return;
    setConfirming(false);
  };

  if (!confirming) {
    return (
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={disabled || busy}
      >
        {busy ? 'Working…' : label}
      </button>
    );
  }

  return (
    <span className="list-item-controls">
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={disabled || busy}
      >
        {busy ? 'Working…' : confirmLabel}
      </button>
      <button
        type="button"
        className="button button-ghost button-xs"
        onClick={handleCancel}
        disabled={busy}
      >
        Cancel
      </button>
    </span>
  );
};

