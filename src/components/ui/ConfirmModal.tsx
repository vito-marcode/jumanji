import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-5">
        <p className="text-jungle-300 text-sm font-cinzel">{message}</p>
        <div className="flex gap-2">
          <Button variant="danger" size="md" onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
          <Button variant="ghost" size="md" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
