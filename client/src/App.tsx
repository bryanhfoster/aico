import './App.css'
import ChatInput from './components/ChatInput'
import ChatBubble, { type ChatRole } from './components/ChatBubble'
import DraggableX from './components/DraggableX'
import { useCallback, useEffect, useRef, useState } from 'react'

function App() {
  type Msg = { id: string; role: ChatRole; text: string }
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'm1', role: 'system', text: 'Welcome to aico. This is a system message.' },
    { id: 'm2', role: 'agent', text: 'Hi! I’m your assistant. Ask me anything.' },
    { id: 'm3', role: 'user', text: 'Cool. Let’s get started.' },
  ])

  // Track which messages are detached (dragged out of center area) with their positions
  type Detached = { id: string; x: number; y: number }
  const [detached, setDetached] = useState<Record<string, Detached>>({})
  const [resetSignal, setResetSignal] = useState<number>(0)

  const handleSend = useCallback((text: string) => {
    const idUser = crypto.randomUUID()
    const idEcho = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: idUser, role: 'user', text },
      { id: idEcho, role: 'agent', text: `Echo: ${text}` },
    ])
  }, [])

  // Scroll container to bottom when messages change
  const streamRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = streamRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  return (
    <main>
      <section
        style={{
          position: 'relative',
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Floating layer for detached bubbles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Object.values(detached).map((d) => {
            const m = messages.find((mm) => mm.id === d.id)
            if (!m) return null
            return (
              <div key={`float-${d.id}`} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${d.x}px, ${d.y}px)`, pointerEvents: 'auto' }}>
                <DraggableX
                  ariaLabel={`${m.role} message (detached)`}
                  initialX={d.x}
                  initialY={d.y}
                  onDragEnd={({ x, y, detached }) => {
                    if (!detached) {
                      setDetached((prev) => {
                        const next = { ...prev }
                        delete next[m.id]
                        return next
                      })
                    } else {
                      setDetached((prev) => ({ ...prev, [m.id]: { id: m.id, x, y } }))
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChatBubble role={m.role}>{m.text}</ChatBubble>
                    <button
                      type="button"
                      onClick={() => {
                        setDetached((prev) => {
                          const next = { ...prev }
                          delete next[m.id]
                          return next
                        })
                        setResetSignal((n) => n + 1)
                      }}
                      title="Return to stream"
                    >
                      Return
                    </button>
                  </div>
                </DraggableX>
              </div>
            )
          })}
        </div>

        {/* Message stream anchored to bottom; new items append at bottom and push older ones upward */}
        <div
          ref={streamRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 8,
            paddingBottom: 72,
            flex: 1,
            overflow: 'auto',
          }}
        >
          {messages.map((m) => {
            const isDetached = Boolean(detached[m.id])
            if (isDetached) {
              return (
                <div key={`ph-${m.id}`} style={{ opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontStyle: 'italic' }}>Detached {m.role} message</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDetached((prev) => {
                        const next = { ...prev }
                        delete next[m.id]
                        return next
                      })
                      setResetSignal((n) => n + 1)
                    }}
                  >
                    Return
                  </button>
                </div>
              )
            }
            return (
              <DraggableX
                key={m.id}
                ariaLabel={`${m.role} message`}
                onDragEnd={({ x, y, detached: isDetachedDrop }) => {
                  if (isDetachedDrop) {
                    setDetached((prev) => ({ ...prev, [m.id]: { id: m.id, x, y } }))
                  } else {
                    setDetached((prev) => {
                      const next = { ...prev }
                      delete next[m.id]
                      return next
                    })
                  }
                }}
                resetToCenterSignal={resetSignal}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChatBubble role={m.role}>{m.text}</ChatBubble>
                </div>
              </DraggableX>
            )
          })}
        </div>

        {/* Pinned input at bottom */}
        <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: 'transparent', paddingTop: 8, paddingBottom: 12 }}>
          <ChatInput onSend={handleSend} onAudioToggle={(r) => console.log('audio recording:', r)} />
        </div>
      </section>
    </main>
  )
}

export default App
