import { IconCopy } from './Icons'

export interface MeasurementPanelProps {
  show: boolean
  measuredDistance: number | null
  copyFeedback: boolean
  onCopy: () => void
  onClear: () => void
}

export function MeasurementPanel({
  show,
  measuredDistance,
  copyFeedback,
  onCopy,
  onClear,
}: MeasurementPanelProps) {
  if (!show || measuredDistance === null) return null

  const displayValue = measuredDistance >= 1
    ? `${measuredDistance.toFixed(2)} m`
    : `${(measuredDistance * 100).toFixed(1)} cm`

  return (
    <div className="canvas3d-calibration-panel">
      <div className="canvas3d-calibration-row">
        <label className="canvas3d-calibration-label">Distance</label>
        <div className="canvas3d-calibration-input-group">
          <input
            type="text"
            className="canvas3d-calibration-input canvas3d-calibration-input--readonly"
            value={copyFeedback ? 'Copied!' : displayValue}
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
