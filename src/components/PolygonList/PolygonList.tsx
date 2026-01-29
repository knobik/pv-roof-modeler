import { useCallback } from 'react'
import type { Polygon } from '../Canvas3D/Canvas3D'
import './PolygonList.css'

export interface PolygonListProps {
  polygons: Polygon[]
  selectedPolygonId?: string | null
  onSelectPolygon?: (polygonId: string | null) => void
  onDeletePolygon?: (polygonId: string) => void
  onPolygonColorChange?: (polygonId: string, color: string) => void
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

const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
  >
    <polyline points="9,18 15,12 9,6" />
  </svg>
)

export function PolygonList({
  polygons,
  selectedPolygonId,
  onSelectPolygon,
  onDeletePolygon,
  onPolygonColorChange,
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
            <div
              key={polygon.id}
              className={`polygon-list-item ${isSelected ? 'polygon-list-item--selected' : ''}`}
              onClick={() => handleSelect(polygon.id)}
            >
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
                className="polygon-list-item-delete"
                onClick={(e) => handleDelete(e, polygon.id)}
                title="Delete polygon"
              >
                <IconTrash />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
