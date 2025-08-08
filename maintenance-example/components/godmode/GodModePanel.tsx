// No React import needed with automatic JSX runtime
import { useGOD } from '../../GOD/context'
import GitDiff from '../diff/GitDiff'

type Props = { open: boolean }

export function GodModePanel({ open }: Props) {
  const { proposal, diff, loading, branch, apply } = useGOD()

  return (
    <aside
      aria-label="God Mode"
      style={{
        width: open ? '50vw' : 0,
        transition: 'width 200ms ease',
        overflow: 'hidden',
        borderLeft: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(6px)',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {open && (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0 }}>aico God Mode</h2>
          {loading && <div style={{ opacity: 0.8 }}>Loading proposal…</div>}
          {proposal && (
            <section>
              <h3 style={{ margin: '8px 0' }}>Overall Explanation</h3>
              <div style={{ opacity: 0.9 }}>{proposal.explanation}</div>
            </section>
          )}

          <section style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 12, minHeight: 0, flex: 1 }}>
            <div style={{ minHeight: 0, overflow: 'auto', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8 }}>
              {proposal?.files.map((f) => (
                <div key={f.path} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 600 }}>{f.path}</div>
                  <div style={{ opacity: 0.8, margin: '6px 0 8px' }}>{f.fileExplanation}</div>
                  <GitDiff diff={f.diff} />
                </div>
              ))}
              {!proposal && !loading && (
                <div style={{ padding: 12, opacity: 0.8 }}>No proposal loaded.</div>
              )}
              {!!diff && (
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>Working Diff</div>
                  <GitDiff diff={diff} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button title="Create branch" onClick={() => branch(`gm/${proposal?.id ?? 'demo'}`)}>
                Branch
              </button>
              <button title="Apply proposed edits" onClick={() => apply()}>
                Apply
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  )
}

export default GodModePanel

