import { Modal } from './Modal'
import { Button } from './Button'
import { useI18n } from '../../i18n'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useI18n()
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-5">
        <p className="text-jungle-300 text-sm font-cinzel">{message}</p>
        <div className="flex gap-2">
          <Button variant="danger" size="md" onClick={onConfirm} className="flex-1">
            {confirmLabel ?? t('common.delete')}
          </Button>
          <Button variant="ghost" size="md" onClick={onCancel} className="flex-1">
            {cancelLabel ?? t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
