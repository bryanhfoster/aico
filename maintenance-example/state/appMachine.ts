import { createMachine, assign } from 'xstate'
import { writeContext } from '../data/db'

export type ToggleableComponentKey = 'counter' | 'mermaid' | 'plan'

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  createdAt: number
}

export type PositionAndSize = {
  x: number
  y: number
  width: number
  height: number
  pinned: boolean
}

export type VoiceState = {
  connected: boolean
  muted: boolean
  error?: string
}

export type AppContext = {
  toggles: Record<ToggleableComponentKey, boolean>
  componentState: Record<string, PositionAndSize>
  messages: Message[]
  voice: VoiceState
}

export type AppEvent =
  | { type: 'TOGGLE_COMPONENT'; key: ToggleableComponentKey }
  | { type: 'SET_COMPONENT_STATE'; key: string; value: Partial<PositionAndSize> }
  | { type: 'PIN_COMPONENT'; key: string; pinned: boolean }
  | { type: 'SEND_MESSAGE'; text: string }
  | { type: 'RECEIVE_MESSAGE'; message: Omit<Message, 'id' | 'createdAt'> }
  | { type: 'VOICE_CONNECT' }
  | { type: 'VOICE_DISCONNECT' }
  | { type: 'VOICE_TOGGLE_MUTE' }
  | { type: 'HYDRATE'; context: AppContext }

const STORAGE_KEY = 'appMachineContext.v1'

function loadInitialContext(): AppContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppContext
  } catch {}
  return {
    toggles: { counter: true, mermaid: false, plan: false },
    componentState: {},
    messages: [],
    voice: { connected: false, muted: true },
  }
}

const persistContext = (context: AppContext) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context))
  } catch {}
  try {
    writeContext(context)
  } catch {}
}

export const appMachine = createMachine({
  id: 'app',
  context: loadInitialContext(),
  on: {
    HYDRATE: {
      actions: assign(({ event }) => event.context),
    },
    TOGGLE_COMPONENT: {
      actions: assign(({ context, event }) => {
        const next = {
          ...context,
          toggles: {
            ...context.toggles,
            [event.key as ToggleableComponentKey]: !context.toggles[
              event.key as ToggleableComponentKey
            ],
          },
        }
        persistContext(next)
        return next
      }),
    },
    SET_COMPONENT_STATE: {
      actions: assign(({ context, event }) => {
        const previous = context.componentState[event.key] ?? {
          x: 24,
          y: 24,
          width: 360,
          height: 240,
          pinned: false,
        }
        const next = {
          ...context,
          componentState: {
            ...context.componentState,
            [event.key]: { ...previous, ...event.value },
          },
        }
        persistContext(next)
        return next
      }),
    },
    PIN_COMPONENT: {
      actions: assign(({ context, event }) => {
        const prev = context.componentState[event.key] ?? {
          x: 24,
          y: 24,
          width: 360,
          height: 240,
          pinned: false,
        }
        const next = {
          ...context,
          componentState: {
            ...context.componentState,
            [event.key]: { ...prev, pinned: event.pinned },
          },
        }
        persistContext(next)
        return next
      }),
    },
    SEND_MESSAGE: {
      actions: assign(({ context, event }) => {
        const newMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          text: event.text,
          createdAt: Date.now(),
        }
        const next = { ...context, messages: [...context.messages, newMessage] }
        persistContext(next)
        return next
      }),
    },
    RECEIVE_MESSAGE: {
      actions: assign(({ context, event }) => {
        const newMessage: Message = {
          id: crypto.randomUUID(),
          role: event.message.role,
          text: event.message.text,
          createdAt: Date.now(),
        }
        const next = { ...context, messages: [...context.messages, newMessage] }
        persistContext(next)
        return next
      }),
    },
    VOICE_CONNECT: {
      actions: assign(({ context }) => {
        const next = { ...context, voice: { ...context.voice, connected: true, error: undefined } }
        persistContext(next)
        return next
      }),
    },
    VOICE_DISCONNECT: {
      actions: assign(({ context }) => {
        const next = { ...context, voice: { ...context.voice, connected: false } }
        persistContext(next)
        return next
      }),
    },
    VOICE_TOGGLE_MUTE: {
      actions: assign(({ context }) => {
        const next = { ...context, voice: { ...context.voice, muted: !context.voice.muted } }
        persistContext(next)
        return next
      }),
    },
  },
})

export type AppMachine = typeof appMachine

