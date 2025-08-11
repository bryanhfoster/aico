import { type ReactNode, useMemo, type CSSProperties } from 'react'
import { FcInfo, FcCustomerSupport, FcBusinessman } from 'react-icons/fc'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

export type ChatRole = 'system' | 'assistant' | 'user' | 'agent'

export interface ChatBubbleProps {
  role: ChatRole
  children: ReactNode
  timestamp?: Date
  showTimestamp?: boolean
}

export default function ChatBubble({ role, children, timestamp = new Date(), showTimestamp = true }: ChatBubbleProps) {
  const { icon, textColor, alignSelf, bubbleStyle } = useMemo(() => {
    const baseStyle: CSSProperties = {
      borderRadius: '18px',
      padding: '12px 16px',
      maxWidth: '100%',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      position: 'relative',
      transition: 'all 0.2s ease',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      hyphens: 'auto' as const
    }

    switch (role) {
      case 'system':
        return {
          icon: <FcInfo aria-hidden className="text-lg" />,
          bubbleColor: '#f8f9fa',
          textColor: '#212529',
          alignSelf: 'flex-start' as const,
          bubbleStyle: {
            ...baseStyle,
            borderTopLeftRadius: '4px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef'
          }
        }
      case 'agent':
        return {
          icon: <FcCustomerSupport aria-hidden className="text-lg" />,
          bubbleColor: '#e9f5ff',
          textColor: '#0a58ca',
          alignSelf: 'flex-start' as const,
          bubbleStyle: {
            ...baseStyle,
            borderTopLeftRadius: '4px',
            background: 'linear-gradient(135deg, #e9f5ff, #d0ebff)',
            border: '1px solid #d0ebff'
          }
        }
      case 'user':
      default:
        return {
          icon: <FcBusinessman aria-hidden className="text-lg" />,
          bubbleColor: '#e6fcf5',
          textColor: '#087f5b',
          alignSelf: 'flex-end' as const,
          bubbleStyle: {
            ...baseStyle,
            borderTopRightRadius: '4px',
            background: 'linear-gradient(135deg, #e6fcf5, #c3fae8)',
            border: '1px solid #c3fae8'
          }
        }
    }
  }, [role])

  const variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25
      }
    }
  }

  return (
    <motion.article
      aria-label={`${role} message`}
      className="chat-bubble"
      initial="hidden"
      animate="visible"
      variants={variants}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignSelf,
        maxWidth: '100%',
        marginBottom: '12px',
      }}
    >
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        flexDirection: alignSelf === 'flex-end' ? 'row-reverse' : 'row',
        alignItems: 'flex-end'
      }}>
        {alignSelf === 'flex-start' && (
          <div className="flex-shrink-0" style={{ 
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            {icon}
          </div>
        )}
        
        <div style={{
          ...bubbleStyle,
          color: textColor,
          lineHeight: '1.5',
          fontSize: '0.95rem'
        }}>
          {children}
          
          {showTimestamp && (
            <div style={{
              fontSize: '0.7rem',
              opacity: 0.7,
              marginTop: '4px',
              textAlign: 'right',
              lineHeight: '1.2'
            }}>
              {format(timestamp, 'h:mm a')}
            </div>
          )}
        </div>
        
        {alignSelf === 'flex-end' && (
          <div className="flex-shrink-0" style={{ 
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            {icon}
          </div>
        )}
      </div>
    </motion.article>
  )
}
