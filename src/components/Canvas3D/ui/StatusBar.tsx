export interface StatusBarProps {
  text: string | null
}

export function StatusBar({ text }: StatusBarProps) {
  if (!text) return null

  return (
    <div className="canvas3d-status">
      {text}
    </div>
  )
}
