import { ReactNode, useMemo } from 'react'
import { FcInfo, FcCustomerSupport, FcBusinessman } from 'react-icons/fc'

export type ChatRole = 'system' | 'agent' | 'user'

export interface ChatBubbleProps {
  role: ChatRole
  children: ReactNode
}

export default function ChatBubble({ role, children }: ChatBubbleProps) {
  const { icon, bubbleColor, textColor, alignSelf } = useMemo(() => {
    switch (role) {
      case 'system':
        return {
          icon: <FcInfo aria-hidden />,
          bubbleColor: '#f3f4f6',
          textColor: '#111827',
          alignSelf: 'flex-start' as const,
        }
      case 'agent':
        return {
          icon: <FcCustomerSupport aria-hidden />,
          bubbleColor: '#e0f2fe',
          textColor: '#0c4a6e',
          alignSelf: 'flex-start' as const,
        }
      case 'user':
      default:
        return {
          icon: <FcBusinessman aria-hidden />,
          bubbleColor: '#dcfce7',
          textColor: '#065f46',
          alignSelf: 'flex-end' as const,
        }
    }
  }, [role])

  return (
    <article
      aria-label={`${role} message`}
      style={{
        display: 'inline-flex',
        gap: 8,
        alignSelf,
        maxWidth: '85%',
      }}
    >
      {alignSelf === 'flex-start' && (
        <span aria-hidden style={{ fontSize: 20, lineHeight: '24px' }}>
          {icon}
        </span>
      )}
      <div
        style={{
          background: bubbleColor,
          color: textColor,
          borderRadius: 12,
          padding: '10px 12px',
          whiteSpace: 'pre-wrap',
          display: 'inline-block',
        }}
      >
        {children}
      </div>
      {alignSelf === 'flex-end' && (
        <span aria-hidden style={{ fontSize: 20, lineHeight: '24px' }}>
          {icon}
        </span>
      )}
    </article>
  )
}


