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

  // Full history stacks for external display
  undoStack: readonly EditorState[]
  redoStack: readonly EditorState[]

  // Navigate to a specific state in history
  goToUndoState: (index: number) => void
  goToRedoState: (index: number) => void
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

  const goToUndoState = useCallback((index: number) => {
    const undoStack = undoStackRef.current
    if (index < 0 || index >= undoStack.length) return

    // Target state becomes current
    const targetState = undoStack[index]

    // States after target (index+1 to end) plus current state go to redo
    const statesToRedo = [
      ...undoStack.slice(index + 1),
      cloneState(state),
    ]

    // States before target remain in undo
    undoStackRef.current = undoStack.slice(0, index)
    redoStackRef.current = [...statesToRedo.reverse(), ...redoStackRef.current]

    setState(targetState)
    forceUpdate({})
  }, [state])

  const goToRedoState = useCallback((index: number) => {
    const redoStack = redoStackRef.current
    if (index < 0 || index >= redoStack.length) return

    // Target state becomes current
    const targetState = redoStack[index]

    // Redo array is in reverse chronological order of undos:
    // - Lower indices = older undos = farther in future (chronologically after target)
    // - Higher indices = newer undos = closer to current (chronologically between current and target)
    //
    // States AFTER target index (closer to current) go to undo in reversed order
    // States BEFORE target index (farther in future) remain in redo
    const statesBetweenCurrentAndTarget = redoStack.slice(index + 1).reverse()
    const statesToUndo = [
      cloneState(state),
      ...statesBetweenCurrentAndTarget,
    ]

    undoStackRef.current = [...undoStackRef.current, ...statesToUndo]
    redoStackRef.current = redoStack.slice(0, index)

    setState(targetState)
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
    undoStack: undoStackRef.current,
    redoStack: redoStackRef.current,
    goToUndoState,
    goToRedoState,
  }), [state, setPolygons, setBodies, undo, redo, takeSnapshot, beginBatch, endBatch, goToUndoState, goToRedoState])

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
