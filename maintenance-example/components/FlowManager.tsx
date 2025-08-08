import React from 'react'
import { useComponentState, useMessages, useToggleStates } from '../state/AppMachineContext'
import { useGOD } from '../GOD/context'
import ResizablePane from './layout/ResizablePane'
import MermaidView from './visualization/Mermaid'
import FloatingMenu from './layout/FloatingActionButton'
import GodModePanel from './godmode/GodModePanel'
import { appTheme } from '../styles/theme.css'
import * as chatStyles from './chat/styles.css'

function CounterSystem() {
  const key = 'counter'
  const { component, set } = useComponentState(key)
  const [count, setCount] = React.useState(0)
  const x = component?.x ?? 24
  const y = component?.y ?? 24
  const width = component?.width ?? 360
  const height = component?.height ?? 200
  return (
    <ResizablePane id={key} x={x} y={y} width={width} height={height} onChange={set}>
      <div style={{ padding: 12 }}>
        <h3>Counter</h3>
        <p>Value: {count}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCount((v) => v - 1)}>-</button>
          <button onClick={() => setCount((v) => v + 1)}>+</button>
          <button onClick={() => setCount(0)}>Reset</button>
        </div>
      </div>
    </ResizablePane>
  )
}

function MermaidSystem() {
  const key = 'mermaid'
  const { component, set } = useComponentState(key)
  const x = component?.x ?? 420
  const y = component?.y ?? 24
  const width = component?.width ?? 420
  const height = component?.height ?? 280
  return (
    <ResizablePane id={key} x={x} y={y} width={width} height={height} onChange={set}>
      <div style={{ padding: 12 }}>
        <h3>Mermaid</h3>
        <MermaidView
          chart={`flowchart TD\n  A[User] --> B[State Machine]\n  B --> C[UI]\n`}
        />
      </div>
    </ResizablePane>
  )
}

function ChatFeed() {
  const { messages } = useMessages()
  return (
    <div className={chatStyles.feed}>
      {messages.map((m) => (
        <div key={m.id} className={chatStyles.bubble}>
          <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>{m.role}</div>
          <div>{m.text}</div>
        </div>
      ))}
    </div>
  )
}

function PinnedChatInput() {
  const { sendMessage } = useMessages()
  const [text, setText] = React.useState('')
  const { toggles } = useToggleStates()
  const god = useGOD()
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    sendMessage(value)
    if (toggles.plan) {
      void god.run(value)
    }
    setText('')
  }
  return (
    <form className={chatStyles.inputBar} onSubmit={onSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message"
        className={chatStyles.textInput}
      />
      <button type="submit" className={chatStyles.iconButton} title="Send">
        ➤
      </button>
    </form>
  )
}

// inline FloatingActionButton removed in favor of dedicated component

export function FlowManager() {
  const { toggles } = useToggleStates()
  return (
    <div className={appTheme} style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
        <ChatFeed />
        {toggles.counter && <CounterSystem />}
        {toggles.mermaid && <MermaidSystem />}
        <FloatingMenu />
        <PinnedChatInput />
      </div>
      <GodModePanel open={toggles.plan} />
    </div>
  )
}

export default FlowManager

