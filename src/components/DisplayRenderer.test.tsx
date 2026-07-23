import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DisplayRenderer } from './DisplayRenderer'

vi.mock('./WidgetRenderer', () => ({
  default: ({ widget }: { widget: { id: string } }) => (
    <div data-testid={`widget-${widget.id}`} />
  ),
}))

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('DisplayRenderer stacking', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies explicit z-indexes and array-index fallbacks to overlapping widgets', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    render(
      <DisplayRenderer
        config={{
          layout: [
            {
              id: 'explicit',
              type: 'clock',
              x: 0,
              y: 0,
              w: 4,
              h: 3,
              zIndex: 9,
            },
            {
              id: 'legacy',
              type: 'notice',
              x: 0,
              y: 0,
              w: 4,
              h: 3,
            },
          ],
        }}
      />,
    )

    expect(screen.getByTestId('widget-explicit').parentElement?.style.zIndex).toBe('9')
    expect(screen.getByTestId('widget-legacy').parentElement?.style.zIndex).toBe('1')
  })
})
