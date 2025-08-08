import React, { createContext, useContext } from 'react'
import type { PropsWithChildren } from 'react'
import { useMachine } from '@xstate/react'
import { appMachine, type AppContext as MachineContext, type AppEvent, type ToggleableComponentKey, type Message, type PositionAndSize } from './appMachine'
import { readContext } from '../data/db'

type Service = ReturnType<typeof useMachine<typeof appMachine>>

const MachineCtx = createContext<Service | null>(null)

export function AppMachineProvider({ children }: PropsWithChildren) {
  const service = useMachine(appMachine)
  const [, send] = service
  // hydrate from lowdb on mount if available
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const fromDb = readContext()
        if (!cancelled && fromDb) {
          send({ type: 'HYDRATE', context: fromDb })
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [send])
  return <MachineCtx.Provider value={service}>{children}</MachineCtx.Provider>
}

function useService() {
  const ctx = useContext(MachineCtx)
  if (!ctx) throw new Error('AppMachineProvider is missing')
  return ctx
}

export function useToggleStates() {
  const [state, send] = useService()
  const toggles = state.context.toggles
  const toggle = (key: ToggleableComponentKey) => send({ type: 'TOGGLE_COMPONENT', key })
  return { toggles, toggle }
}

export function useComponentState(key: string) {
  const [state, send] = useService()
  const component = state.context.componentState[key]
  const set = (value: Partial<PositionAndSize>) => send({ type: 'SET_COMPONENT_STATE', key, value })
  const pin = (pinned: boolean) => send({ type: 'PIN_COMPONENT', key, pinned })
  return { component, set, pin }
}

export function useMessages() {
  const [state, send] = useService()
  const messages = state.context.messages
  const sendMessage = (text: string) => {
    send({ type: 'SEND_MESSAGE', text })
    // simulate AI response
    setTimeout(() => {
      send({ type: 'RECEIVE_MESSAGE', message: { role: 'assistant', text: `You said: ${text}` } })
    }, 500)
  }
  const receive = (message: Omit<Message, 'id' | 'createdAt'>) => send({ type: 'RECEIVE_MESSAGE', message })
  return { messages, sendMessage, receive }
}

export function useVoice() {
  const [state, send] = useService()
  const voice = state.context.voice
  const connect = () => send({ type: 'VOICE_CONNECT' })
  const disconnect = () => send({ type: 'VOICE_DISCONNECT' })
  const toggleMute = () => send({ type: 'VOICE_TOGGLE_MUTE' })
  return { voice, connect, disconnect, toggleMute }
}

export type AppContext = MachineContext
export type { AppEvent }

