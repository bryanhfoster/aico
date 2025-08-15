import { useCallback, useState, useRef, useEffect } from 'react'
import { FiSend, FiMic, FiMicOff, FiPaperclip, FiSmile } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

export interface ChatInputProps {
  onSend: (message: string) => void;
  onAudioSend?: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  onAudioToggle?: (recording: boolean) => void;
}

export default function ChatInput({
  onSend,
  onAudioSend,
  disabled = false,
  placeholder = 'Type a message…',
  onAudioToggle,
}: ChatInputProps) {
  const [message, setMessage] = useState<string>('')
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isFocused, setIsFocused] = useState<boolean>(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [, setAudioChunks] = useState<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);


  // Auto-resize textarea as user types
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  useEffect(() => {
    if (isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamRef.current = stream;
          const options = { mimeType: 'audio/webm;codecs=opus' };
          const recorder = new MediaRecorder(stream, options);
          const chunks: Blob[] = [];
          
          // Collect data more frequently for better responsiveness
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              console.log('Audio chunk received, size:', e.data.size, 'type:', e.data.type);
              chunks.push(e.data);
            }
          };
          
          recorder.onstop = async () => {
            try {
              console.log('Stopped recording, total chunks:', chunks.length);
              const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
              console.log('Created audio blob, size:', audioBlob.size, 'type:', audioBlob.type);
              
              if (onAudioSend) {
                await onAudioSend(audioBlob);
              }
            } catch (error) {
              console.error('Error in onstop handler:', error);
            } finally {
              setAudioChunks([]);
            }
          };
          
          mediaRecorderRef.current = recorder;
          
          // Start collecting data every 100ms for better chunking
          recorder.start(100);
          console.log('Started recording with MIME type:', options.mimeType);
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          setIsRecording(false);
          if (onAudioToggle) onAudioToggle(false);
        });
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          console.log('Stopped recording, waiting for onstop...');
        } catch (error) {
          console.error('Error stopping media recorder:', error);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
        streamRef.current = null;
      }
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error('Error in cleanup - stopping media recorder:', error);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording, onAudioToggle, onAudioSend]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) e.preventDefault()
      const text = message.trim()
      if (!text || disabled) return
      onSend(text)
      setMessage('')
      // Reset textarea height after send
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    },
    [message, onSend, disabled]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const toggleRecording = useCallback(() => {
    if (!isRecording) {
      setAudioChunks([]);
      setIsRecording(true);
      if (onAudioToggle) onAudioToggle(true);
    } else {
      setIsRecording(false);
      if (onAudioToggle) onAudioToggle(false);
    }
  }, [isRecording, onAudioToggle]);

  const handleAttachmentClick = () => {
    // TODO: Implement file attachment
    console.log('Attachment clicked')
  }

  const handleEmojiClick = () => {
    // TODO: Implement emoji picker
    console.log('Emoji picker clicked')
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="chat-input-form"
      style={{
        position: 'relative',
        width: '90%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 16px 16px 16px',
        transition: 'all 0.2s ease',
      }}
    >
      <div 
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          background: 'white',
          borderRadius: '24px',
          padding: '8px 16px',
          boxShadow: isFocused 
            ? '0 2px 12px rgba(0, 0, 0, 0.1)' 
            : '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${isFocused ? '#4dabf7' : '#e9ecef'}`,
          transition: 'all 0.2s ease',
        }}
      >
        {/* <button
          type="button"
          onClick={handleAttachmentClick}
          disabled={disabled}
          className="action-button"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#495057',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          title="Attach file"
        >
          <FiPaperclip size={18} />
        </button> */}

        <div style={{ flex: 1, position: 'relative',}}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Message"
            style={{
              width: '100%',
              minHeight: '16px',
              maxHeight: '120px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              lineHeight: '1',
              textAlign: 'left',

              color: '#212529',
              padding: '16 0 0 0',
              background: 'transparent',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
            }}
            rows={1}
          />
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleEmojiClick}
            disabled={disabled}
            className="action-button"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#495057',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            title="Add emoji"
          >
            <FiSmile size={18} />
          </button>

          <AnimatePresence mode="wait">
            {message.trim() ? (
              <motion.button
                key="send"
                type="submit"
                disabled={disabled || !message.trim()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: '#1971c2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                title="Send message"
              >
                <FiMic size={16} />
              </motion.button>
            ) : (
              <motion.button
                key="mic"
                type="button"
                onClick={toggleRecording}
                disabled={disabled}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: isRecording ? '#ff6b6b' : '#f1f3f5',
                  color: isRecording ? 'white' : '#495057',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                title={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? <FiMicOff size={18} /> : <FiMic size={18} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: '#868e96',
        textAlign: 'right',
        marginTop: '4px',
        padding: '0 8px',
        height: '16px',
      }}>
        {message.length > 0 && `${message.length}/1000`}
      </div>
    </form>
  )
}
