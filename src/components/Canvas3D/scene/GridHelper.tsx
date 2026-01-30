export interface GridHelperProps {
  size: number
}

export function GridHelper({ size }: GridHelperProps) {
  return <gridHelper args={[size, size, '#888888', '#cccccc']} />
}
