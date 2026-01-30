import { IconCopy } from './Icons'

export interface CalibrationPanelProps {
  show: boolean
  knownLength: number
  calculatedPixelsPerMeter: number | null
  copyFeedback: boolean
  onKnownLengthChange: (value: number) => void
  onCopy: () => void
  onClear: () => void
}

export function CalibrationPanel({
  show,
  knownLength,
  calculatedPixelsPerMeter,
  copyFeedback,
  onKnownLengthChange,
  onCopy,
  onClear,
}: CalibrationPanelProps) {
  if (!show) return null

  return (
    <div className="canvas3d-calibration-panel">
      <div className="canvas3d-calibration-row">
        <label className="canvas3d-calibration-label">Known length</label>
        <div className="canvas3d-calibration-input-group">
          <input
            type="number"
            className="canvas3d-calibration-input"
            min="0.1"
            step="0.1"
            value={knownLength}
            onChange={(e) => onKnownLengthChange(parseFloat(e.target.value) || 0)}
          />
          <span className="canvas3d-calibration-unit">m</span>
        </div>
      </div>
      {calculatedPixelsPerMeter !== null && (
        <div className="canvas3d-calibration-row">
          <label className="canvas3d-calibration-label">Pixels/Meter</label>
          <div className="canvas3d-calibration-input-group">
            <input
              type="text"
              className="canvas3d-calibration-input canvas3d-calibration-input--readonly"
              value={copyFeedback ? 'Copied!' : calculatedPixelsPerMeter.toFixed(2)}
              readOnly
            />
            <button
              className="canvas3d-calibration-copy"
              onClick={onCopy}
              title="Copy to clipboard"
            >
              <IconCopy />
            </button>
          </div>
        </div>
      )}
      <div className="canvas3d-calibration-actions">
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
