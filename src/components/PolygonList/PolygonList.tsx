import { useCallback } from 'react'
import type { Polygon } from '../Canvas3D/Canvas3D'
import './PolygonList.css'

export interface PolygonListProps {
  polygons: Polygon[]
  selectedPolygonId?: string | null
  /** Pixels per meter ratio for distance conversion */
  pixelsPerMeter?: number
  /** Image width in pixels for distance conversion */
  imageWidth?: number
  onSelectPolygon?: (polygonId: string | null) => void
  onDeletePolygon?: (polygonId: string) => void
  onPolygonColorChange?: (polygonId: string, color: string) => void
  onPolygonVisibilityChange?: (polygonId: string, visible: boolean) => void
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
  selectedPolygonId,
  onSelectPolygon,
  onDeletePolygon,
  onPolygonColorChange,
  onPolygonVisibilityChange,
}: PolygonListProps) {
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

  const handlePolygonVisibilityToggle = useCallback(
    (e: React.MouseEvent, polygonId: string, currentVisible: boolean) => {
      e.stopPropagation()
      onPolygonVisibilityChange?.(polygonId, !currentVisible)
    },
    [onPolygonVisibilityChange]
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

          return (
            <div key={polygon.id} className="polygon-list-tree-item">
              <div
                className={`polygon-list-item ${isSelected ? 'polygon-list-item--selected' : ''}`}
                onClick={() => handleSelect(polygon.id)}
              >
                <div className="polygon-list-expand-placeholder" />
                <div className="polygon-list-item-icon">
                  <IconPolygon />
                </div>
                <div className="polygon-list-item-info">
                  <div className="polygon-list-item-name">Polygon {index + 1}</div>
                  <div className="polygon-list-item-meta">
                    {pointCount} points{lineCount > 0 && ` • ${lineCount} lines`}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
