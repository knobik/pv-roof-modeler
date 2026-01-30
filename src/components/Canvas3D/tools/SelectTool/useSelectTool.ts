import { useCallback } from 'react'
import type { ToolHookReturn } from '../types'

export function useSelectTool(): ToolHookReturn {
  const onActivate = useCallback(() => {
    // Select tool is default - just enables orbit controls
  }, [])

  return {
    state: {},
    actions: {
      onActivate,
    },
    render: {
      SceneElements: null,
      UIElements: null,
      statusText: null,
    },
  }
}
