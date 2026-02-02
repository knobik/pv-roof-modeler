# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React component library for 3D canvas interactions, specifically designed for annotating aerial images with polygon outlines (e.g., marking house boundaries). Built with React 18/19, TypeScript, and Three.js via react-three-fiber.

## Commands

- `npm run dev` - Start Vite dev server with demo playground
- `npm run build` - TypeScript check + Vite library build (outputs to `dist/`)
- `npm run build:demo` - Build demo for GitHub Pages deployment
- `npm run lint` - Run ESLint

## Architecture

**Library Mode**: Configured as a Vite library (`vite.config.ts`). Entry point is `src/index.ts`. React/ReactDOM are externalized as peer dependencies.

**Key Components**:
- `Canvas3D` - 3D canvas with image plane, polygon drawing/editing, orbit controls. Supports controlled mode via `polygons`/`onPolygonsChange` props.
- `PolygonList` - Sidebar component for managing polygons with color pickers and visibility toggles.
- `PVRoofModeler` - Higher-level component combining Canvas3D + PolygonList with built-in state management and undo/redo.

**3D Stack**: Uses `@react-three/fiber` for React-Three.js bindings, `@react-three/drei` for OrbitControls and Line, and `suncalc` for realistic sun positioning.

**Demo**: `src/demo/` contains a playground app (excluded from library build).

## Canvas3D Internal Architecture

The Canvas3D component uses a modular architecture:

```
src/components/Canvas3D/
├── Canvas3D.tsx      # Main component
├── types.ts          # Polygon, ToolName types
├── constants.ts      # OUTLINE_HEIGHT, POINT_SIZE, PLANE_WIDTH, etc.
├── primitives/       # Low-level 3D components (DraggablePoint, ClickableEdge, etc.)
├── scene/            # Scene composition (Scene, ImagePlane, SunLight, PolygonOutlines, etc.)
├── tools/            # Tool hooks + useToolManager (centralizes tool orchestration)
├── ui/               # HTML overlay components (Toolbox, StatusBar, CalibrationPanel, etc.)
└── context/          # React contexts (CanvasContext, ToolContext)
```

**Key Patterns**:

1. **Controlled/Uncontrolled Hybrid**: Internal state (`internalPolygons`) is always used for rendering to enable smooth drag feedback. In controlled mode, internal state syncs with props except during active drag operations.

2. **Point Scaling**: All interactive points use `useFrame` to scale based on camera distance, maintaining consistent visual size regardless of zoom.

3. **Tool Manager**: `useToolManager` centralizes all tool orchestration—it initializes tool hooks, routes events to the active tool, handles tool switching with lifecycle (onActivate/onDeactivate), and exposes computed flags like `isDrawing` and `orbitEnabled`.

4. **Context Architecture**: Two contexts provide shared state:
   - `ToolContext`: Active tool, tool-specific state (currentPoints, calibrationPoints, measurementPoints)
   - `CanvasContext`: Canvas state (polygons, imageData, drag state, pixel/meter ratio)

## Adding New Tools

1. Create `tools/NewTool/useNewTool.ts` hook implementing `ToolHookReturn<YourToolState>`
2. Export hook and types from `tools/NewTool/index.ts` and `tools/index.ts`
3. Add tool name to `ToolName` union in `types.ts`
4. Initialize the tool hook in `useToolManager.ts` and add to the `tools` object
5. Route events to your tool in `useToolManager.handlers`
6. Add tool button to `ui/Toolbox.tsx`
7. If the tool needs shared state, add it to `ToolContext`

## Current Tools

- `select` - Default mode for orbit controls and point dragging
- `polygon` - Draw new polygons by clicking points
- `perpendicular` - Enforce 90-degree angles at polygon vertices
- `calibration` - Set pixels-per-meter ratio by marking a known distance
- `measurement` - Measure distances on the image plane

## Key Constants

Defined in `Canvas3D/constants.ts`:
- `PLANE_WIDTH = 5` - Width of image plane in 3D units (used for pixel-to-meter calculations)
- `OUTLINE_HEIGHT = 0.01` - Y-position for polygon outlines
- `BASE_CAMERA_DISTANCE = 8` - Reference distance for point scaling

## History System

The `useHistory` hook (in `src/hooks/useHistory.tsx`) provides undo/redo for `PVRoofModeler`:
- `takeSnapshot()` - Call before destructive operations to save state
- `beginBatch()`/`endBatch()` - Group multiple changes (e.g., point dragging) into one undo step
- State is deep-cloned using `Vector3.clone()` to preserve Three.js objects

## User Preferences

When the user says `#remember <something>`, add that note here.
