import { useState, useCallback } from 'react'
import { Canvas3D, Polygon } from '../components/Canvas3D'
import { PolygonList } from '../components/PolygonList'

export function App() {
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null)

  const handlePolygonsChange = useCallback((newPolygons: Polygon[]) => {
    setPolygons(newPolygons)
  }, [])

  const handleDeletePolygon = useCallback((polygonId: string) => {
    setPolygons((prev) => prev.filter((p) => p.id !== polygonId))
    if (selectedPolygonId === polygonId) {
      setSelectedPolygonId(null)
    }
  }, [selectedPolygonId])

  const handlePolygonColorChange = useCallback((polygonId: string, color: string) => {
    setPolygons((prev) =>
      prev.map((p) => (p.id === polygonId ? { ...p, color } : p))
    )
  }, [])

  return (
    <div className="playground">
      <h1>Component Playground</h1>

      <section>
        <h2>Canvas3D with Polygon List</h2>
        <p style={{ marginBottom: '1rem' }}>
          Drop an image or click to upload. Use the toolbox to draw polygons and lines.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Canvas3D
              height="calc(100vh - 220px)"
              showGrid={false}
              polygons={polygons}
              onPolygonsChange={handlePolygonsChange}
            />
          </div>
          <div style={{ width: '320px', flexShrink: 0 }}>
            <PolygonList
              polygons={polygons}
              selectedPolygonId={selectedPolygonId}
              onSelectPolygon={setSelectedPolygonId}
              onDeletePolygon={handleDeletePolygon}
              onPolygonColorChange={handlePolygonColorChange}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
