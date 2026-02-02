import { useHistoryOptional } from '../../hooks'
import type { EditorState } from '../../hooks'
import './HistoryDebugger.css'

export interface HistoryDebuggerProps {
  /** Title for the debugger panel (default: 'History') */
  title?: string
  /** Show polygon counts (default: true) */
  showCounts?: boolean
  /** Max height before scrolling (default: 300) */
  maxHeight?: number | string
}

interface StatePreviewProps {
  state: EditorState
  label: string
  isCurrent?: boolean
  onClick?: () => void
}

function StatePreview({ state, label, isCurrent, onClick }: StatePreviewProps) {
  const polygonCount = state.polygons.length
  const pointCount = state.polygons.reduce((sum, p) => sum + p.points.length, 0)

  return (
    <div
      className={`history-debugger-item ${isCurrent ? 'history-debugger-item--current' : ''} ${onClick ? 'history-debugger-item--clickable' : ''}`}
      onClick={onClick}
    >
      <span className="history-debugger-item-label">{label}</span>
      <span className="history-debugger-item-stats">
        {polygonCount} poly, {pointCount} pts
      </span>
    </div>
  )
}

export function HistoryDebugger({
  title = 'History',
  showCounts = true,
  maxHeight = 300,
}: HistoryDebuggerProps) {
  const history = useHistoryOptional()

  if (!history) {
    return (
      <div className="history-debugger">
        <div className="history-debugger-header">
          <span className="history-debugger-title">{title}</span>
        </div>
        <div className="history-debugger-empty">
          No HistoryProvider found
        </div>
      </div>
    )
  }

  const { undoStack, redoStack, state, goToUndoState, goToRedoState } = history

  return (
    <div className="history-debugger">
      <div className="history-debugger-header">
        <span className="history-debugger-title">{title}</span>
        {showCounts && (
          <span className="history-debugger-counts">
            {undoStack.length} undo / {redoStack.length} redo
          </span>
        )}
      </div>
      <div className="history-debugger-list" style={{ maxHeight }}>
        {/* Redo stack (future states) - furthest redo at top, closest to current at bottom */}
        {redoStack.length > 0 && (
          <div className="history-debugger-section">
            <div className="history-debugger-section-label">Redo</div>
            {redoStack.map((s, i) => (
              <StatePreview
                key={`redo-${i}`}
                state={s}
                label={`+${redoStack.length - i}`}
                onClick={() => goToRedoState(i)}
              />
            ))}
          </div>
        )}

        {/* Current state */}
        <div className="history-debugger-section">
          <div className="history-debugger-section-label">Current</div>
          <StatePreview state={state} label="now" isCurrent />
        </div>

        {/* Undo stack (past states) - shown in reverse so most recent is at top */}
        {undoStack.length > 0 && (
          <div className="history-debugger-section">
            <div className="history-debugger-section-label">Undo</div>
            {[...undoStack].reverse().map((s, i) => {
              const actualIndex = undoStack.length - 1 - i
              return (
                <StatePreview
                  key={`undo-${i}`}
                  state={s}
                  label={`-${i + 1}`}
                  onClick={() => goToUndoState(actualIndex)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
