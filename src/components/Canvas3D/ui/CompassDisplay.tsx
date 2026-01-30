export interface CompassDisplayProps {
  rotation: number
}

export function CompassDisplay({ rotation }: CompassDisplayProps) {
  return (
    <div className="canvas3d-compass">
      <div
        className="canvas3d-compass-rose"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="canvas3d-compass-n">N</div>
        <div className="canvas3d-compass-e">E</div>
        <div className="canvas3d-compass-s">S</div>
        <div className="canvas3d-compass-w">W</div>
        <div className="canvas3d-compass-needle" />
      </div>
    </div>
  )
}
