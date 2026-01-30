export interface PolygonActionsProps {
  canUndo: boolean
  canFinish: boolean
  onUndo: () => void
  onFinish: () => void
  onCancel: () => void
}

export function PolygonActions({
  canUndo,
  canFinish,
  onUndo,
  onFinish,
  onCancel,
}: PolygonActionsProps) {
  if (!canUndo) return null

  return (
    <div className="canvas3d-actions">
      <button className="canvas3d-action-btn" onClick={onUndo}>
        Undo
      </button>
      {canFinish && (
        <button className="canvas3d-action-btn canvas3d-action-btn--primary" onClick={onFinish}>
          Finish
        </button>
      )}
      <button className="canvas3d-action-btn canvas3d-action-btn--danger" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
