import React from 'react'

type Props = { diff: string }

function lineStyle(l: string): React.CSSProperties {
  if (l.startsWith('+++') || l.startsWith('---') || l.startsWith('diff')) {
    return { color: '#9aa0a6' }
  }
  if (l.startsWith('@@')) return { color: '#c792ea' }
  if (l.startsWith('+')) return { color: '#81c995' }
  if (l.startsWith('-')) return { color: '#f28b82' }
  return { color: 'inherit' }
}

export default function GitDiff({ diff }: Props) {
  const lines = React.useMemo(() => diff.split(/\r?\n/), [diff])
  return (
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 6 }}>
      {lines.map((l, i) => (
        <div key={i} style={lineStyle(l)}>{l}</div>
      ))}
    </pre>
  )
}


