import { PVRoofModeler } from '../components/PVRoofModeler'

export function App() {
  return (
    <div className="playground">
      <h1>PV Roof Modeler</h1>
      <section>
        <p style={{ marginBottom: '1rem' }}>
          Drop an image or click to upload. Use the toolbox to draw polygons, add lines, and create 3D bodies.
          Sun position is calculated for Warsaw, Poland.
        </p>
        <PVRoofModeler
          height="calc(100vh - 240px)"
          showGrid={false}
          latitude={52.2297}
          longitude={21.0122}
        />
      </section>
    </div>
  )
}
