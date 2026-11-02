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

  it('veils the layout and shows the holding screen with the logo when the display is coming soon', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    const { container } = render(
      <DisplayRenderer
        config={{
          comingSoon: true,
          logo: { type: 'svg', value: '<svg xmlns="http://www.w3.org/2000/svg"/>' },
          layout: [{ id: 'clock', type: 'clock', x: 0, y: 0, w: 4, h: 3 }],
        }}
      />,
    )

    expect(screen.getByText('Coming Soon')).toBeTruthy()
    const veil = container.querySelector('[data-coming-soon-veil="true"]') as HTMLElement
    expect(veil.style.filter).toContain('blur')
    expect(veil.contains(screen.getByTestId('widget-clock'))).toBe(true)
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })

  it('renders no holding screen for a normal display', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    const { container } = render(
      <DisplayRenderer config={{ layout: [{ id: 'clock', type: 'clock', x: 0, y: 0, w: 4, h: 3 }] }} />,
    )
    expect(screen.queryByText('Coming Soon')).toBeNull()
    expect(container.querySelector('[data-coming-soon-veil]')).toBeNull()
  })
})
