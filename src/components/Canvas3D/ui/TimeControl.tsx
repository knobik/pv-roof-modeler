import { IconSun } from './Icons'

export interface TimeControlProps {
  timeOfDay: number
  onTimeChange: (time: number) => void
}

export function TimeControl({ timeOfDay, onTimeChange }: TimeControlProps) {
  return (
    <div className="canvas3d-time-control">
      <div className="canvas3d-time-icon">
        <IconSun />
      </div>
      <input
        type="range"
        className="canvas3d-time-slider"
        min="0"
        max="24"
        step="0.5"
        value={timeOfDay}
        onChange={(e) => onTimeChange(parseFloat(e.target.value))}
        title={`Time: ${Math.floor(timeOfDay)}:${String(Math.round((timeOfDay % 1) * 60)).padStart(2, '0')}`}
      />
      <span className="canvas3d-time-label">
        {Math.floor(timeOfDay)}:{String(Math.round((timeOfDay % 1) * 60)).padStart(2, '0')}
      </span>
    </div>
  )
}
