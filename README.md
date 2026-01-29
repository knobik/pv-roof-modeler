# PV Roof Modeler

A React component library for annotating aerial images with polygon outlines in a 3D canvas. Built with React 18/19, TypeScript, and Three.js via react-three-fiber.

**[Live Demo](https://knobik.github.io/pv-roof-modeler/)**

## Features

- **3D Canvas** - Upload aerial images and view them on a 3D plane with orbit controls
- **Polygon Drawing** - Draw polygon outlines to mark boundaries (e.g., house rooftops)
- **Point Editing** - Drag points to adjust polygons, add points on edges, remove points with right-click
- **Internal Lines** - Add lines between polygon points to define faces
- **3D Bodies** - Extract polygons into 3D extruded building shapes with adjustable height
- **Shadows** - Realistic shadow casting with adjustable time of day
- **Sun Simulation** - Dynamic sun position and lighting based on time of day (6am-6pm)
- **Polygon Management** - Hierarchical list component for managing polygons and their associated bodies
- **Compass** - Visual compass indicator showing current camera orientation

## Installation

```bash
npm install pv-roof-modeler
```

## Quick Start

The simplest way to get started is with the `PVRoofModeler` component, which combines the canvas and sidebar with built-in state management:

```tsx
import { PVRoofModeler } from 'pv-roof-modeler'
import 'pv-roof-modeler/styles.css'

function App() {
  return (
    <PVRoofModeler
      height={600}
      onPolygonsChange={(polygons) => console.log('Polygons:', polygons)}
      onBodiesChange={(bodies) => console.log('Bodies:', bodies)}
    />
  )
}
```

## Advanced Usage

For full control over state and layout, use `Canvas3D` and `PolygonList` separately:

```tsx
import { useState } from 'react'
import { Canvas3D, PolygonList, Polygon, Body } from 'pv-roof-modeler'
import 'pv-roof-modeler/styles.css'

function App() {
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [bodies, setBodies] = useState<Body[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Canvas3D
        height="600px"
        polygons={polygons}
        bodies={bodies}
        onPolygonsChange={setPolygons}
        onBodiesChange={setBodies}
      />
      <PolygonList
        polygons={polygons}
        bodies={bodies}
        selectedPolygonId={selectedId}
        onSelectPolygon={setSelectedId}
        onDeletePolygon={(id) => setPolygons(p => p.filter(x => x.id !== id))}
        onPolygonColorChange={(id, color) =>
          setPolygons(p => p.map(x => x.id === id ? { ...x, color } : x))
        }
        onDeleteBody={(id) => setBodies(b => b.filter(x => x.id !== id))}
        onBodyColorChange={(id, color) =>
          setBodies(b => b.map(x => x.id === id ? { ...x, color } : x))
        }
        onBodyHeightChange={(id, height) =>
          setBodies(b => b.map(x => x.id === id ? { ...x, height } : x))
        }
      />
    </div>
  )
}
```

## Components

### PVRoofModeler

All-in-one component that combines `Canvas3D` and `PolygonList` with built-in state management. This is the recommended way to use the library for most use cases.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | `'100%'` | Editor width |
| `height` | `number \| string` | `500` | Editor height |
| `backgroundColor` | `string` | `'#1a1a2e'` | Canvas background color |
| `gridSize` | `number` | `10` | Size of the grid helper |
| `showGrid` | `boolean` | `true` | Show grid helper |
| `shadows` | `boolean` | `true` | Enable shadow casting for bodies |
| `timeOfDay` | `number` | `10` | Time of day (0-24), affects sun position and shadows |
| `showTimeControl` | `boolean` | `true` | Show time of day slider control |
| `sidebarWidth` | `number \| string` | `280` | Width of the polygon list sidebar |
| `sidebarPosition` | `'left' \| 'right'` | `'right'` | Position of the sidebar |
| `hideSidebar` | `boolean` | `false` | Hide the sidebar completely |
| `polygons` | `Polygon[]` | - | Controlled polygons array (optional) |
| `bodies` | `Body[]` | - | Controlled bodies array (optional) |
| `onPolygonsChange` | `(polygons: Polygon[]) => void` | - | Callback when polygons change |
| `onBodiesChange` | `(bodies: Body[]) => void` | - | Callback when bodies change |
| `onImageLoad` | `(file: File) => void` | - | Callback when image is loaded |
| `onSelectionChange` | `(polygonId: string \| null) => void` | - | Callback when selection changes |
| `onTimeOfDayChange` | `(time: number) => void` | - | Callback when time of day changes |

### Canvas3D

3D canvas for image display and polygon annotation.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | `'100%'` | Canvas width |
| `height` | `number \| string` | `500` | Canvas height |
| `backgroundColor` | `string` | `'#1a1a2e'` | Background color |
| `gridSize` | `number` | `10` | Size of the grid helper |
| `showGrid` | `boolean` | `true` | Show grid helper |
| `shadows` | `boolean` | `true` | Enable shadow casting for bodies |
| `timeOfDay` | `number` | `10` | Time of day (0-24), affects sun position and shadows |
| `showTimeControl` | `boolean` | `false` | Show time of day slider control |
| `outlineColor` | `string` | auto | Override polygon outline color (auto-cycles through preset colors) |
| `polygons` | `Polygon[]` | - | Controlled polygons array |
| `bodies` | `Body[]` | - | Controlled 3D bodies array |
| `onPolygonsChange` | `(polygons: Polygon[]) => void` | - | Callback when polygons change |
| `onBodiesChange` | `(bodies: Body[]) => void` | - | Callback when bodies change |
| `onImageLoad` | `(file: File) => void` | - | Callback when image is loaded |
| `onTimeOfDayChange` | `(time: number) => void` | - | Callback when time of day changes |

**Tools:**
- **Select (V)** - Default mode for orbit controls and point dragging
- **Polygon (P)** - Draw new polygons by clicking points; click first point to close
- **Line (L)** - Add internal lines between polygon points
- **Body (B)** - Click polygons to extrude them into 3D bodies

**Interactions:**
- Drag points to reposition them
- Click on edges to add new points
- Right-click points to delete them (minimum 3 points)
- Right-click bodies to delete them (in Body tool mode)

### PolygonList

Hierarchical list component for managing polygons and bodies.

| Prop | Type | Description |
|------|------|-------------|
| `polygons` | `Polygon[]` | Array of polygons to display |
| `bodies` | `Body[]` | Array of bodies (shown nested under their parent polygon) |
| `selectedPolygonId` | `string \| null` | Currently selected polygon ID |
| `onSelectPolygon` | `(id: string \| null) => void` | Selection callback |
| `onDeletePolygon` | `(id: string) => void` | Delete polygon callback |
| `onPolygonColorChange` | `(id: string, color: string) => void` | Polygon color change callback |
| `onDeleteBody` | `(id: string) => void` | Delete body callback |
| `onBodyColorChange` | `(id: string, color: string) => void` | Body color change callback |
| `onBodyHeightChange` | `(id: string, height: number) => void` | Body height change callback |

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
  points: THREE.Vector3[]  // base points (synced with polygon)
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

# Build demo for deployment
npm run build:demo

# Lint
npm run lint
```

## License

MIT
