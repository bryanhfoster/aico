import React from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'dark' })

type Props = { chart: string }

export function Mermaid({ chart }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!ref.current) return
    const id = `mmd-${Math.random().toString(36).slice(2)}`
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      })
      .catch(() => {})
  }, [chart])

  return <div ref={ref} />
}

export default Mermaid

