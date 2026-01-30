import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import type { Polygon, Body } from '../components/Canvas3D'

export interface EditorState {
  polygons: Polygon[]
  bodies: Body[]
}

export interface HistoryContextValue {
  state: EditorState
  setPolygons: (polygons: Polygon[]) => void
  setBodies: (bodies: Body[]) => void

  // History actions
  undo: () => void
  redo: () => void
  takeSnapshot: () => void
  beginBatch: () => void
  endBatch: () => void
  canUndo: boolean
  canRedo: boolean
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

export interface HistoryProviderProps {
  children: React.ReactNode
  maxHistorySize?: number
  initialPolygons?: Polygon[]
  initialBodies?: Body[]
}

function cloneState(state: EditorState): EditorState {
  return {
    polygons: state.polygons.map(p => ({
      ...p,
      points: p.points.map(pt => pt.clone()),
      lines: [...p.lines],
    })),
    bodies: state.bodies.map(b => ({
      ...b,
      points: b.points.map(pt => pt.clone()),
    })),
  }
}

export function HistoryProvider({
  children,
  maxHistorySize = 50,
  initialPolygons = [],
  initialBodies = [],
}: HistoryProviderProps) {
  const [state, setState] = useState<EditorState>({
    polygons: initialPolygons,
    bodies: initialBodies,
  })

  const undoStackRef = useRef<EditorState[]>([])
  const redoStackRef = useRef<EditorState[]>([])
  const isBatchingRef = useRef(false)
  const batchStartStateRef = useRef<EditorState | null>(null)

  // Force re-render when stacks change
  const [, forceUpdate] = useState({})

  const takeSnapshot = useCallback(() => {
    // Don't take snapshots during batch operations
    if (isBatchingRef.current) return

    const snapshot = cloneState(state)
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-maxHistorySize)
    redoStackRef.current = []
    forceUpdate({})
  }, [state, maxHistorySize])

  const beginBatch = useCallback(() => {
    if (isBatchingRef.current) return
    isBatchingRef.current = true
    batchStartStateRef.current = cloneState(state)
  }, [state])

  const endBatch = useCallback(() => {
    if (!isBatchingRef.current) return
    isBatchingRef.current = false

    if (batchStartStateRef.current) {
      undoStackRef.current = [...undoStackRef.current, batchStartStateRef.current].slice(-maxHistorySize)
      redoStackRef.current = []
      batchStartStateRef.current = null
      forceUpdate({})
    }
  }, [maxHistorySize])

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return

    const previousState = undoStackRef.current[undoStackRef.current.length - 1]
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    redoStackRef.current = [...redoStackRef.current, cloneState(state)]

    setState(previousState)
    forceUpdate({})
  }, [state])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return

    const nextState = redoStackRef.current[redoStackRef.current.length - 1]
    redoStackRef.current = redoStackRef.current.slice(0, -1)
    undoStackRef.current = [...undoStackRef.current, cloneState(state)]

    setState(nextState)
    forceUpdate({})
  }, [state])

  const setPolygons = useCallback((polygons: Polygon[]) => {
    setState(prev => ({ ...prev, polygons }))
  }, [])

  const setBodies = useCallback((bodies: Body[]) => {
    setState(prev => ({ ...prev, bodies }))
  }, [])

  const value: HistoryContextValue = useMemo(() => ({
    state,
    setPolygons,
    setBodies,
    undo,
    redo,
    takeSnapshot,
    beginBatch,
    endBatch,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  }), [state, setPolygons, setBodies, undo, redo, takeSnapshot, beginBatch, endBatch])

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory(): HistoryContextValue {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider')
  }
  return context
}

export function useHistoryOptional(): HistoryContextValue | null {
  return useContext(HistoryContext)
}
