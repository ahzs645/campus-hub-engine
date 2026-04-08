import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack'

type GridSlot = {
  x: number
  y: number
  w: number
  h: number
}

type InternalGridStackEngine = GridStackEngine & {
  _notify(removedNodes?: GridStackNode[]): GridStackEngine
}

function snapshotSlot(node: GridStackNode): GridSlot {
  return {
    x: node.x ?? 0,
    y: node.y ?? 0,
    w: node.w ?? 1,
    h: node.h ?? 1,
  }
}

function applySlot(node: GridStackNode, slot: GridSlot) {
  node.x = slot.x
  node.y = slot.y
  node.w = slot.w
  node.h = slot.h
}

export class GridderGridStackEngine extends GridStackEngine {
  override moveNodeCheck(node: GridStackNode, move: GridStackMoveOpts) {
    if (this.trySwapIntoCollision(node, move)) {
      return true
    }

    return super.moveNodeCheck(node, move)
  }

  override swap(a: GridStackNode, b: GridStackNode) {
    if (!a || !b || a._id === b._id || a.locked || b.locked) {
      return false
    }

    const aSlot = snapshotSlot(a)
    const bSlot = snapshotSlot(b)

    if (!this.nodeFitsSlot(a, bSlot) || !this.nodeFitsSlot(b, aSlot)) {
      return false
    }

    applySlot(a, bSlot)
    applySlot(b, aSlot)
    a._dirty = true
    b._dirty = true

    return true
  }

  private trySwapIntoCollision(node: GridStackNode, move: GridStackMoveOpts) {
    if (move.resizing || !node._moving || move.nested) {
      return false
    }

    const projected = this.projectMove(node, move)
    const collides = this.collideAll(node, projected as GridStackNode, move.skip)

    if (collides.length === 0) {
      return false
    }

    const collide = this.directionCollideCoverage(
      node,
      { ...move, ...projected },
      collides,
    )

    if (!collide || !this.swap(node, collide)) {
      return false
    }

    ;(this as InternalGridStackEngine)._notify()
    return true
  }

  private projectMove(node: GridStackNode, move: GridStackMoveOpts) {
    const projected: GridStackNode = {
      ...node,
      x: typeof move.x === 'number' ? move.x : node.x,
      y: typeof move.y === 'number' ? move.y : node.y,
      w: typeof move.w === 'number' ? move.w : node.w,
      h: typeof move.h === 'number' ? move.h : node.h,
    }

    this.nodeBoundFix(
      projected,
      projected.w !== node.w || projected.h !== node.h,
    )

    return projected
  }

  private nodeFitsSlot(node: GridStackNode, slot: GridSlot) {
    const candidate: GridStackNode = {
      ...node,
      ...slot,
    }

    this.nodeBoundFix(candidate, slot.w !== node.w || slot.h !== node.h)

    return (
      candidate.x === slot.x &&
      candidate.y === slot.y &&
      candidate.w === slot.w &&
      candidate.h === slot.h
    )
  }
}
