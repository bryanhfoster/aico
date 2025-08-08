import { useCallback, useState } from 'react'

export interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  onAudioToggle?: (recording: boolean) => void
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
  onAudioToggle,
}: ChatInputProps) {
  const [message, setMessage] = useState<string>('')
  const [isRecording, setIsRecording] = useState<boolean>(false)

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) e.preventDefault()
      const text = message.trim()
      if (!text || disabled) return
      onSend(text)
      setMessage('')
    },
    [message, onSend, disabled],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => {
      const next = !prev
      if (onAudioToggle) onAudioToggle(next)
      return next
    })
  }, [onAudioToggle])

  return (
    <form onSubmit={handleSubmit} aria-label="chat input" style={{ display: 'flex', gap: 8, width: '100%' }}>
      <button
        type="button"
        onClick={toggleRecording}
        aria-pressed={isRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        disabled={disabled}
        title={isRecording ? 'Stop recording (stub)' : 'Start recording (stub)'}
      >
        {isRecording ? '⏹️' : '🎤'}
      </button>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Message"
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={disabled || message.trim().length === 0} title="Send message">
        Send
      </button>
    </form>
  )
}


