import { useCallback, useState } from 'react'
import type { Polygon, Body } from '../Canvas3D/Canvas3D'
import './PolygonList.css'

// The image plane width in Three.js units (must match Canvas3D PLANE_WIDTH)
const PLANE_WIDTH = 5

export interface PolygonListProps {
  polygons: Polygon[]
  bodies?: Body[]
  selectedPolygonId?: string | null
  /** Pixels per meter ratio for height conversion */
  pixelsPerMeter?: number
  /** Image width in pixels for height conversion */
  imageWidth?: number
  onSelectPolygon?: (polygonId: string | null) => void
  onDeletePolygon?: (polygonId: string) => void
  onPolygonColorChange?: (polygonId: string, color: string) => void
  onPolygonVisibilityChange?: (polygonId: string, visible: boolean) => void
  onDeleteBody?: (bodyId: string) => void
  onBodyColorChange?: (bodyId: string, color: string) => void
  onBodyHeightChange?: (bodyId: string, height: number) => void
  onBodyVisibilityChange?: (bodyId: string, visible: boolean) => void
}

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconPolygon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 22,8.5 18,21 6,21 2,8.5" />
  </svg>
)

const IconBody = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
    <path d="M2 7l10 5 10-5" />
    <path d="M12 12v10" />
  </svg>
)

const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`polygon-list-chevron ${expanded ? 'polygon-list-chevron--expanded' : ''}`}
  >
    <polyline points="9,18 15,12 9,6" />
  </svg>
)

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

export function PolygonList({
  polygons,
  bodies = [],
  selectedPolygonId,
  pixelsPerMeter,
  imageWidth,
  onSelectPolygon,
  onDeletePolygon,
  onPolygonColorChange,
  onPolygonVisibilityChange,
  onDeleteBody,
  onBodyColorChange,
  onBodyHeightChange,
  onBodyVisibilityChange,
}: PolygonListProps) {
  // Track collapsed items instead of expanded - this way items start expanded by default
  const [collapsedPolygons, setCollapsedPolygons] = useState<Set<string>>(new Set())

  // Calculate units per meter for height conversion
  // unitsPerMeter = PLANE_WIDTH * pixelsPerMeter / imageWidth
  const unitsPerMeter = pixelsPerMeter && imageWidth
    ? (PLANE_WIDTH * pixelsPerMeter) / imageWidth
    : null

  // Convert height from Three.js units to meters
  const unitsToMeters = useCallback(
    (units: number): number => {
      if (!unitsPerMeter) return units
      return units / unitsPerMeter
    },
    [unitsPerMeter]
  )

  // Convert height from meters to Three.js units
  const metersToUnits = useCallback(
    (meters: number): number => {
      if (!unitsPerMeter) return meters
      return meters * unitsPerMeter
    },
    [unitsPerMeter]
  )

  const toggleExpanded = useCallback((polygonId: string) => {
    setCollapsedPolygons((prev) => {
      const next = new Set(prev)
      if (next.has(polygonId)) {
        next.delete(polygonId)
      } else {
        next.add(polygonId)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (polygonId: string) => {
      if (selectedPolygonId === polygonId) {
        onSelectPolygon?.(null)
      } else {
        onSelectPolygon?.(polygonId)
      }
    },
    [selectedPolygonId, onSelectPolygon]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent, polygonId: string) => {
      e.stopPropagation()
      onDeletePolygon?.(polygonId)
    },
    [onDeletePolygon]
  )

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, polygonId: string) => {
      e.stopPropagation()
      onPolygonColorChange?.(polygonId, e.target.value)
    },
    [onPolygonColorChange]
  )

  const handleBodyDelete = useCallback(
    (e: React.MouseEvent, bodyId: string) => {
      e.stopPropagation()
      onDeleteBody?.(bodyId)
    },
    [onDeleteBody]
  )

  const handleBodyColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, bodyId: string) => {
      e.stopPropagation()
      onBodyColorChange?.(bodyId, e.target.value)
    },
    [onBodyColorChange]
  )

  const handleBodyHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, bodyId: string) => {
      e.stopPropagation()
      const inputValue = parseFloat(e.target.value)
      if (!isNaN(inputValue) && inputValue > 0) {
        // Convert from meters to units if conversion is available
        const heightInUnits = metersToUnits(inputValue)
        onBodyHeightChange?.(bodyId, heightInUnits)
      }
    },
    [onBodyHeightChange, metersToUnits]
  )

  const handlePolygonVisibilityToggle = useCallback(
    (e: React.MouseEvent, polygonId: string, currentVisible: boolean) => {
      e.stopPropagation()
      onPolygonVisibilityChange?.(polygonId, !currentVisible)
    },
    [onPolygonVisibilityChange]
  )

  const handleBodyVisibilityToggle = useCallback(
    (e: React.MouseEvent, bodyId: string, currentVisible: boolean) => {
      e.stopPropagation()
      onBodyVisibilityChange?.(bodyId, !currentVisible)
    },
    [onBodyVisibilityChange]
  )

  const getBodiesForPolygon = useCallback(
    (polygonId: string) => bodies.filter((b) => b.polygonId === polygonId),
    [bodies]
  )

  if (polygons.length === 0) {
    return (
      <div className="polygon-list">
        <div className="polygon-list-header">
          <span>Polygons</span>
          <span className="polygon-list-count">0</span>
        </div>
        <div className="polygon-list-empty">
          No polygons yet. Use the polygon tool to create one.
        </div>
      </div>
    )
  }

  return (
    <div className="polygon-list">
      <div className="polygon-list-header">
        <span>Polygons</span>
        <span className="polygon-list-count">{polygons.length}</span>
      </div>
      <div className="polygon-list-items">
        {polygons.map((polygon, index) => {
          const isSelected = selectedPolygonId === polygon.id
          const pointCount = polygon.points.length
          const lineCount = polygon.lines?.length || 0
          const polygonBodies = getBodiesForPolygon(polygon.id)
          const hasChildren = polygonBodies.length > 0
          const isExpanded = hasChildren && !collapsedPolygons.has(polygon.id)

          return (
            <div key={polygon.id} className="polygon-list-tree-item">
              <div
                className={`polygon-list-item ${isSelected ? 'polygon-list-item--selected' : ''}`}
                onClick={() => handleSelect(polygon.id)}
              >
                {hasChildren && (
                  <button
                    className="polygon-list-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(polygon.id)
                    }}
                  >
                    <IconChevron expanded={isExpanded} />
                  </button>
                )}
                {!hasChildren && <div className="polygon-list-expand-placeholder" />}
                <div className="polygon-list-item-icon">
                  <IconPolygon />
                </div>
                <div className="polygon-list-item-info">
                  <div className="polygon-list-item-name">Polygon {index + 1}</div>
                  <div className="polygon-list-item-meta">
                    {pointCount} points{lineCount > 0 && ` • ${lineCount} lines`}
                    {polygonBodies.length > 0 && ` • ${polygonBodies.length} body`}
                  </div>
                </div>
                <input
                  type="color"
                  className="polygon-list-item-color"
                  value={polygon.color}
                  onChange={(e) => handleColorChange(e, polygon.id)}
                  onClick={(e) => e.stopPropagation()}
                  title="Change color"
                />
                <button
                  className={`polygon-list-item-visibility ${polygon.visible === false ? 'polygon-list-item-visibility--hidden' : ''}`}
                  onClick={(e) => handlePolygonVisibilityToggle(e, polygon.id, polygon.visible !== false)}
                  title={polygon.visible === false ? 'Show polygon' : 'Hide polygon'}
                >
                  {polygon.visible === false ? <IconEyeOff /> : <IconEye />}
                </button>
                <button
                  className="polygon-list-item-delete"
                  onClick={(e) => handleDelete(e, polygon.id)}
                  title="Delete polygon"
                >
                  <IconTrash />
                </button>
              </div>

              {hasChildren && isExpanded && (
                <div className="polygon-list-children">
                  {polygonBodies.map((body, bodyIndex) => (
                    <div key={body.id} className="polygon-list-body-item">
                      <div className="polygon-list-body-row">
                        <div className="polygon-list-body-icon">
                          <IconBody />
                        </div>
                        <div className="polygon-list-body-info">
                          <div className="polygon-list-body-name">Body {bodyIndex + 1}</div>
                        </div>
                        <input
                          type="color"
                          className="polygon-list-item-color"
                          value={body.color}
                          onChange={(e) => handleBodyColorChange(e, body.id)}
                          onClick={(e) => e.stopPropagation()}
                          title="Change color"
                        />
                        <button
                          className={`polygon-list-item-visibility ${body.visible === false ? 'polygon-list-item-visibility--hidden' : ''}`}
                          onClick={(e) => handleBodyVisibilityToggle(e, body.id, body.visible !== false)}
                          title={body.visible === false ? 'Show body' : 'Hide body'}
                        >
                          {body.visible === false ? <IconEyeOff /> : <IconEye />}
                        </button>
                        <button
                          className="polygon-list-item-delete"
                          onClick={(e) => handleBodyDelete(e, body.id)}
                          title="Delete body"
                        >
                          <IconTrash />
                        </button>
                      </div>
                      <div className="polygon-list-body-height">
                        <label className="polygon-list-body-height-label">
                          Height{unitsPerMeter ? ' (m)' : ''}
                        </label>
                        <input
                          type="range"
                          className="polygon-list-body-height-slider"
                          min={unitsPerMeter ? '0.5' : '0.1'}
                          max={unitsPerMeter ? '20' : '3'}
                          step={unitsPerMeter ? '0.5' : '0.05'}
                          value={unitsToMeters(body.height)}
                          onChange={(e) => handleBodyHeightChange(e, body.id)}
                          title={`Height: ${unitsToMeters(body.height).toFixed(2)}${unitsPerMeter ? 'm' : ''}`}
                        />
                        <input
                          type="number"
                          className="polygon-list-body-height-input"
                          min={unitsPerMeter ? '0.1' : '0.1'}
                          max={unitsPerMeter ? '50' : '10'}
                          step={unitsPerMeter ? '0.1' : '0.1'}
                          value={parseFloat(unitsToMeters(body.height).toFixed(2))}
                          onChange={(e) => handleBodyHeightChange(e, body.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
