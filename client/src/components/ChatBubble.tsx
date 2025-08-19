import { type ReactNode, useMemo, type CSSProperties, useState, useRef, useEffect } from 'react'
import { FcInfo, FcCustomerSupport, FcBusinessman } from 'react-icons/fc'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { FaMicrophone, FaVolumeUp } from 'react-icons/fa'

export type ChatRole = 'system' | 'assistant' | 'user' | 'agent'

export interface ChatBubbleProps {
  role: ChatRole
  children: ReactNode
  timestamp?: Date
  showTimestamp?: boolean
  audioBlob?: Blob
}

export default function ChatBubble({ 
  role, 
  children, 
  timestamp = new Date(), 
  showTimestamp = true, 
  audioBlob 
}: ChatBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')

  // Create URL for the audio blob when it changes
  useEffect(() => {
    if (audioBlob && audioBlob instanceof Blob) {
      try {
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (error) {
        console.error('Error creating audio URL:', error)
        setAudioUrl('')
      }
    } else {
      setAudioUrl('')
    }
  }, [audioBlob])

  const togglePlayPause = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => setIsPlaying(false)
    const handlePause = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
    }
  }, [audioUrl])

  const { icon, textColor, alignSelf, bubbleStyle, audioIcon } = useMemo(() => {
    const baseStyle: CSSProperties = {
      borderRadius: '18px',
      padding: '12px 16px',
      maxWidth: '100%',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      position: 'relative',
      transition: 'all 0.2s ease',
      whiteSpace: 'normal',
      wordBreak: 'break-all',
      overflowWrap: 'break-word',
      hyphens: 'auto',
      width: '100%',
      lineHeight: '1.5',
      boxSizing: 'border-box',
      overflow: 'visible',
      display: 'block',
      textAlign: 'left',
      margin: '4px 0',
      wordWrap: 'break-word',
      overflowX: 'hidden',
      minWidth: 0,
      msWordBreak: 'break-all',
      WebkitHyphens: 'auto',
      MozHyphens: 'auto',
      msHyphens: 'auto',
    }

    switch (role) {
      case 'system':
        return {
          icon: <FcInfo aria-hidden className="text-lg" />,
          audioIcon: null,
          textColor: '#212529',
          alignSelf: 'center' as const,
          bubbleStyle: {
            ...baseStyle,
            borderTopLeftRadius: '4px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            textAlign: 'center',
            maxWidth: '80%',
            margin: '4px auto'
          }
        }
      case 'agent':
      case 'assistant':
        return {
          icon: <FcCustomerSupport aria-hidden className="text-lg" />,
          audioIcon: <FaVolumeUp size={14} />,
          textColor: '#212529',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          alignSelf: 'flex-start' as const,
          bubbleStyle: {
            ...baseStyle,
            borderTopLeftRadius: '4px',
            background: 'linear-gradient(135deg, #e9f5ff, #d0ebff)',
            border: '1px solid #d0ebff',
            textAlign: 'left',
            marginRight: 'auto'
          }
        }
      case 'user':
      default:
        return {
          icon: <FcBusinessman aria-hidden className="text-lg" />,
          audioIcon: <FaMicrophone size={14} />,
          textColor: '#087f5b',
          alignSelf: 'flex-end' as const,
          bubbleStyle: {
            ...baseStyle,
            borderTopRightRadius: '4px',
            background: 'linear-gradient(135deg, #e6fcf5, #c3fae8)',
            border: '1px solid #c3fae8',
            textAlign: 'right',
            marginLeft: 'auto'
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

  // Audio element (hidden)
  const audioElement = audioUrl ? (
    <audio 
      ref={audioRef} 
      src={audioUrl} 
      preload="metadata"
      style={{ display: 'none' }}
    />
  ) : null

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
      }}
    >
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
        width: '100%'
      }}>
        {/* Show icon on the left for agent */}
        {(role === 'agent' || role === 'assistant') && (
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: role === 'user' ? 'flex-end' : 'flex-start',
          gap: '4px',
          maxWidth: 'calc(100% - 40px)',
          width: 'auto'
        }}>
          <div style={{
            ...bubbleStyle,
            color: textColor,
            lineHeight: '1.5',
            fontSize: '0.95rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
            padding: audioUrl ? '12px 16px' : '12px 16px',
            cursor: audioUrl ? 'pointer' : 'default',
            width: '100%',
            maxWidth: '100%',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: audioUrl ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            },
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            overflow: 'hidden'
          } as CSSProperties}
          onClick={audioUrl ? togglePlayPause : undefined}
          >
            <div style={{ width: '100%' }}>
              {children}
            </div>
            {audioUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <FaMicrophone size={14} color={'green'} />
                ) : (
                  <FaVolumeUp size={14} color={'#087f5b'} />
                )}
              </button>
            )}
          </div>
          
          {showTimestamp && (
            <div style={{
              fontSize: '0.7rem',
              opacity: 0.7,
              textAlign: 'right',
              lineHeight: '1.2',
              width: '100%',
              paddingRight: '4px'
            }}>
              {format(timestamp, 'h:mm a')}
            </div>
          )}
        </div>
        
        {/* Show icon on the right for user */}
        {role === 'user' && (
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
      {audioElement}
    </motion.article>
  )
}
