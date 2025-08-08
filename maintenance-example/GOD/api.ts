const BASE = import.meta.env.VITE_GOD_URL ?? 'http://localhost:4399'

export async function fetchProposal(query?: string) {
  const res = await fetch(`${BASE}/gm/proposal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error('proposal_failed')
  return res.json()
}

export async function createBranch(branch?: string) {
  const res = await fetch(`${BASE}/gm/branch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ branch }),
  })
  if (!res.ok) throw new Error('branch_failed')
  return res.json()
}

export async function applyProposal() {
  const res = await fetch(`${BASE}/gm/apply`, { method: 'POST' })
  if (!res.ok) throw new Error('apply_failed')
  return res.json()
}

export async function fetchDiff() {
  const res = await fetch(`${BASE}/gm/diff`)
  if (!res.ok) throw new Error('diff_failed')
  return res.json()
}


