import type { ToolName } from '../types'
import type { HistoryContextValue } from '../../../hooks/useHistory'
import { IconCursor, IconPolygon, IconLine, IconBuilding, IconCalibration, IconMeasurement, IconPerpendicular, IconUndo, IconRedo } from './Icons'

export interface ToolboxProps {
  activeTool: ToolName
  onSelectTool: (tool: ToolName) => void
  polygonsCount: number
  historyContext?: HistoryContextValue
}

export function Toolbox({
  activeTool,
  onSelectTool,
  polygonsCount,
  historyContext,
}: ToolboxProps) {
  return (
    <div className="canvas3d-toolbox">
      <button
        className={`canvas3d-tool ${activeTool === 'select' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('select')}
        title="Select"
      >
        <IconCursor />
        <span className="canvas3d-tool-tooltip">Select (V)</span>
      </button>
      <div className="canvas3d-toolbox-divider" />
      <button
        className={`canvas3d-tool ${activeTool === 'polygon' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('polygon')}
        title="Add Polygon"
      >
        <IconPolygon />
        <span className="canvas3d-tool-tooltip">Add Polygon (P)</span>
      </button>
      <button
        className={`canvas3d-tool ${activeTool === 'line' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('line')}
        disabled={polygonsCount === 0}
        title="Add Line"
      >
        <IconLine />
        <span className="canvas3d-tool-tooltip">Add Line (L)</span>
      </button>
      <button
        className={`canvas3d-tool ${activeTool === 'perpendicular' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('perpendicular')}
        disabled={polygonsCount === 0}
        title="Perpendicular Constraint"
      >
        <IconPerpendicular />
        <span className="canvas3d-tool-tooltip">Perpendicular (R)</span>
      </button>
      <button
        className={`canvas3d-tool ${activeTool === 'building' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('building')}
        disabled={polygonsCount === 0}
        title="Add Building"
      >
        <IconBuilding />
        <span className="canvas3d-tool-tooltip">Add Building (B)</span>
      </button>
      <div className="canvas3d-toolbox-divider" />
      <button
        className={`canvas3d-tool ${activeTool === 'calibration' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('calibration')}
        title="Calibrate pixels per meter"
      >
        <IconCalibration />
        <span className="canvas3d-tool-tooltip">Calibrate (C)</span>
      </button>
      <button
        className={`canvas3d-tool ${activeTool === 'measurement' ? 'canvas3d-tool--active' : ''}`}
        onClick={() => onSelectTool('measurement')}
        title="Measure distance"
      >
        <IconMeasurement />
        <span className="canvas3d-tool-tooltip">Measure (M)</span>
      </button>

      {historyContext && (
        <>
          <div className="canvas3d-toolbox-divider" />

          <button
            className="canvas3d-tool"
            onClick={historyContext.undo}
            disabled={!historyContext.canUndo}
            title="Undo (Ctrl+Z)"
          >
            <IconUndo />
            <span className="canvas3d-tool-tooltip">Undo</span>
          </button>
          <button
            className="canvas3d-tool"
            onClick={historyContext.redo}
            disabled={!historyContext.canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <IconRedo />
            <span className="canvas3d-tool-tooltip">Redo</span>
          </button>
        </>
      )}
    </div>
  )
}
