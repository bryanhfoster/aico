import React from 'react'

type Props = { title?: string; children: React.ReactNode }

export function SystemChatBubble({ title, children }: Props) {
  return (
    <div
      style={{
        margin: '8px 0',
        padding: 12,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 12,
      }}
    >
      {title && <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>}
      <div>{children}</div>
    </div>
  )
}

export default SystemChatBubble

