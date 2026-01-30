# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React component library for 3D canvas interactions, specifically designed for annotating aerial images with polygon outlines (e.g., marking house boundaries). Built with React 19, TypeScript, and Three.js via react-three-fiber.

## Commands

- `npm run dev` - Start Vite dev server with demo playground
- `npm run build` - TypeScript check + Vite library build (outputs to `dist/`)
- `npm run lint` - Run ESLint

## Architecture

**Library Mode**: Configured as a Vite library (`vite.config.ts`). The entry point is `src/index.ts` which exports all public components. React/ReactDOM are externalized as peer dependencies.

**Key Components**:
- `Canvas3D` - 3D canvas with image plane, polygon drawing/editing, and orbit controls. Supports controlled mode via `polygons`/`onPolygonsChange` props for external state management.
- `PolygonList` - Companion component displaying polygon list with color pickers and delete actions.

**3D Stack**: Uses `@react-three/fiber` for React-Three.js bindings and `@react-three/drei` for OrbitControls and Line components.

**Demo**: `src/demo/` contains a playground app for testing components locally. The demo is not included in the library build.

## Component Patterns

`Canvas3D` uses a hybrid controlled/uncontrolled pattern:
- Internal state (`internalPolygons`) is always used for rendering to enable smooth drag feedback
- In controlled mode, internal state syncs with props except during active drag operations
- The `Polygon` interface includes `points` (Vector3[]), `color`, and `lines` (pairs of point indices for internal face lines)

## User Preferences

When the user says `#remember <something>`, add that note to this CLAUDE.md file under this section.
