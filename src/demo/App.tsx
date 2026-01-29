import { useState } from 'react'
import { PVRoofModeler } from '../components/PVRoofModeler'

export function App() {
  const [latitude, setLatitude] = useState(52.2297)
  const [longitude, setLongitude] = useState(21.0122)
  const [date, setDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })

  return (
    <div className="playground">
      <h1>PV Roof Modeler</h1>
      <section>
        <p style={{ marginBottom: '1rem' }}>
          Drop an image or click to upload. Use the toolbox to draw polygons, add lines, and create 3D bodies.
        </p>
        <div className="location-controls">
          <div className="control-group">
            <label htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="control-group">
            <label htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="control-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <PVRoofModeler
          height="calc(100vh - 300px)"
          showGrid={false}
          latitude={latitude}
          longitude={longitude}
          date={new Date(date)}
        />
      </section>
    </div>
  )
}
