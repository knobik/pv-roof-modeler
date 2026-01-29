import { useState, useCallback } from 'react'
import { Canvas3D, Polygon, Body } from '../components/Canvas3D'
import { PolygonList } from '../components/PolygonList'

export function App() {
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [bodies, setBodies] = useState<Body[]>([])
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null)

  const handlePolygonsChange = useCallback((newPolygons: Polygon[]) => {
    setPolygons(newPolygons)
  }, [])

  const handleBodiesChange = useCallback((newBodies: Body[]) => {
    setBodies(newBodies)
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

  const handleDeleteBody = useCallback((bodyId: string) => {
    setBodies((prev) => prev.filter((b) => b.id !== bodyId))
  }, [])

  const handleBodyColorChange = useCallback((bodyId: string, color: string) => {
    setBodies((prev) =>
      prev.map((b) => (b.id === bodyId ? { ...b, color } : b))
    )
  }, [])

  const handleBodyHeightChange = useCallback((bodyId: string, height: number) => {
    setBodies((prev) =>
      prev.map((b) => (b.id === bodyId ? { ...b, height } : b))
    )
  }, [])

  return (
    <div className="playground">
      <h1>Component Playground</h1>

      <section>
        <h2>Canvas3D with Polygon List</h2>
        <p style={{ marginBottom: '1rem' }}>
          Drop an image or click to upload. Use the toolbox to draw polygons, lines, and 3D bodies.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Canvas3D
              height="calc(100vh - 220px)"
              showGrid={false}
              polygons={polygons}
              bodies={bodies}
              onPolygonsChange={handlePolygonsChange}
              onBodiesChange={handleBodiesChange}
            />
          </div>
          <div style={{ width: '320px', flexShrink: 0 }}>
            <PolygonList
              polygons={polygons}
              bodies={bodies}
              selectedPolygonId={selectedPolygonId}
              onSelectPolygon={setSelectedPolygonId}
              onDeletePolygon={handleDeletePolygon}
              onPolygonColorChange={handlePolygonColorChange}
              onDeleteBody={handleDeleteBody}
              onBodyColorChange={handleBodyColorChange}
              onBodyHeightChange={handleBodyHeightChange}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
