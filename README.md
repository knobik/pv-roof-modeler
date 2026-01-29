# PV Project Library

A React component library for annotating aerial images with polygon outlines in a 3D canvas. Built with React, TypeScript, and Three.js.

## Features

- **3D Canvas** - Upload aerial images and view them on a 3D plane with orbit controls
- **Polygon Drawing** - Draw polygon outlines to mark boundaries (e.g., house rooftops)
- **Point Editing** - Drag points to adjust polygons, add points on edges, remove points with right-click
- **Internal Lines** - Add lines between polygon points to define faces
- **3D Bodies** - Extract polygons into 3D extruded building shapes
- **Polygon Management** - Companion component for listing, selecting, and managing polygons

## Installation

```bash
npm install my-react-components
```

## Usage

```tsx
import { useState } from 'react'
import { Canvas3D, PolygonList, Polygon } from 'my-react-components'
import 'my-react-components/styles.css'

function App() {
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Canvas3D
        height="600px"
        polygons={polygons}
        onPolygonsChange={setPolygons}
      />
      <PolygonList
        polygons={polygons}
        selectedPolygonId={selectedId}
        onSelectPolygon={setSelectedId}
        onDeletePolygon={(id) => setPolygons(p => p.filter(x => x.id !== id))}
        onPolygonColorChange={(id, color) =>
          setPolygons(p => p.map(x => x.id === id ? { ...x, color } : x))
        }
      />
    </div>
  )
}
```

## Components

### Canvas3D

3D canvas for image display and polygon annotation.

| Prop | Type | Description |
|------|------|-------------|
| `width` | `number \| string` | Canvas width (default: `'100%'`) |
| `height` | `number \| string` | Canvas height (default: `500`) |
| `backgroundColor` | `string` | Background color (default: `'#1a1a2e'`) |
| `showGrid` | `boolean` | Show grid helper (default: `true`) |
| `polygons` | `Polygon[]` | Controlled polygons array |
| `bodies` | `Body[]` | Controlled 3D bodies array |
| `onPolygonsChange` | `(polygons: Polygon[]) => void` | Callback when polygons change |
| `onBodiesChange` | `(bodies: Body[]) => void` | Callback when bodies change |
| `onImageLoad` | `(file: File) => void` | Callback when image is loaded |

### PolygonList

List component for managing polygons.

| Prop | Type | Description |
|------|------|-------------|
| `polygons` | `Polygon[]` | Array of polygons to display |
| `selectedPolygonId` | `string \| null` | Currently selected polygon ID |
| `onSelectPolygon` | `(id: string) => void` | Selection callback |
| `onDeletePolygon` | `(id: string) => void` | Delete callback |
| `onPolygonColorChange` | `(id: string, color: string) => void` | Color change callback |

### Polygon Interface

```typescript
interface Polygon {
  id: string
  points: THREE.Vector3[]
  color: string
  lines: [number, number][]  // pairs of point indices for internal lines
}
```

### Body Interface

```typescript
interface Body {
  id: string
  polygonId: string  // reference to source polygon
  points: THREE.Vector3[]  // base points (from polygon)
  height: number
  color: string
}
```

## Development

```bash
# Install dependencies
npm install

# Start dev server with demo playground
npm run dev

# Build library
npm run build

# Lint
npm run lint
```

## License

MIT
