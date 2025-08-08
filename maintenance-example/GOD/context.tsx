import React, { createContext, useContext } from 'react'
import * as api from './api'
import type { ProposedEdit } from './types'

type GodState = {
  loading: boolean
  proposal: ProposedEdit | null
  diff: string
  run: (query: string) => Promise<void>
  refreshDiff: () => Promise<void>
  branch: (name?: string) => Promise<void>
  apply: () => Promise<void>
}

const Ctx = createContext<GodState | null>(null)

export function GODProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(false)
  const [proposal, setProposal] = React.useState<ProposedEdit | null>(null)
  const [diff, setDiff] = React.useState('')

  const refreshDiff = React.useCallback(async () => {
    const d = await api.fetchDiff()
    setDiff(d.diff ?? '')
  }, [])

  const run = React.useCallback(async (query: string) => {
    setLoading(true)
    try {
      const p = await api.fetchProposal(query)
      setProposal(p)
    } finally {
      setLoading(false)
      await refreshDiff()
    }
  }, [refreshDiff])

  const branch = React.useCallback(async (name?: string) => {
    await api.createBranch(name)
    await refreshDiff()
  }, [refreshDiff])

  const apply = React.useCallback(async () => {
    await api.applyProposal()
    await refreshDiff()
  }, [refreshDiff])

  const value: GodState = { loading, proposal, diff, run, refreshDiff, branch, apply }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGOD() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('GODProvider is missing')
  return ctx
}


