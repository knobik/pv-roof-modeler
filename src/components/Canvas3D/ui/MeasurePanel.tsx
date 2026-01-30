import { IconCopy } from './Icons'

export interface MeasurePanelProps {
  show: boolean
  knownLength: number
  calculatedPixelsPerMeter: number | null
  copyFeedback: boolean
  onKnownLengthChange: (value: number) => void
  onCopy: () => void
  onClear: () => void
}

export function MeasurePanel({
  show,
  knownLength,
  calculatedPixelsPerMeter,
  copyFeedback,
  onKnownLengthChange,
  onCopy,
  onClear,
}: MeasurePanelProps) {
  if (!show) return null

  return (
    <div className="canvas3d-measure-panel">
      <div className="canvas3d-measure-row">
        <label className="canvas3d-measure-label">Known length</label>
        <div className="canvas3d-measure-input-group">
          <input
            type="number"
            className="canvas3d-measure-input"
            min="0.1"
            step="0.1"
            value={knownLength}
            onChange={(e) => onKnownLengthChange(parseFloat(e.target.value) || 0)}
          />
          <span className="canvas3d-measure-unit">m</span>
        </div>
      </div>
      {calculatedPixelsPerMeter !== null && (
        <div className="canvas3d-measure-row">
          <label className="canvas3d-measure-label">Pixels/Meter</label>
          <div className="canvas3d-measure-input-group">
            <input
              type="text"
              className="canvas3d-measure-input canvas3d-measure-input--readonly"
              value={copyFeedback ? 'Copied!' : calculatedPixelsPerMeter.toFixed(2)}
              readOnly
            />
            <button
              className="canvas3d-measure-copy"
              onClick={onCopy}
              title="Copy to clipboard"
            >
              <IconCopy />
            </button>
          </div>
        </div>
      )}
      <div className="canvas3d-measure-actions">
        <button
          className="canvas3d-action-btn"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
