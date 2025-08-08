import React from 'react'
import { useToggleStates } from '../../state/AppMachineContext'
import { FcMenu, FcFrame, FcPlus, FcRight } from 'react-icons/fc'

export function FloatingActionButton() {
  const { toggles, toggle } = useToggleStates()
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 88 }}>
      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 8,
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12,
            padding: 8,
            backdropFilter: 'blur(6px)',
          }}
        >
          <button onClick={() => toggle('counter')} title="Toggle Counter">
            <FcPlus /> {toggles.counter ? 'Hide' : 'Show'} Counter
          </button>
          <button onClick={() => toggle('mermaid')} title="Toggle Mermaid">
            <FcFrame /> {toggles.mermaid ? 'Hide' : 'Show'} Mermaid
          </button>
          <button onClick={() => toggle('plan')} title="Toggle God Mode">
            <FcRight /> {toggles.plan ? 'Hide' : 'Show'} God Mode
          </button>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} title="Menu" style={{ fontSize: 20 }}>
        <FcMenu />
      </button>
    </div>
  )
}

export default FloatingActionButton

