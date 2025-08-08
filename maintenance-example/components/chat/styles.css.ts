import { style } from '@vanilla-extract/css'
import { colorBorder, colorCard, colorText } from '../../styles/theme.css.ts'

export const feed = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '80px 16px 120px',
  gap: 10,
})

export const bubble = style({
  maxWidth: 780,
  width: '100%',
  borderRadius: 16,
  background: colorCard,
  border: `1px solid ${colorBorder}`,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  padding: 14,
})

export const inputBar = style({
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: 'min(860px, 92vw)',
  background: colorCard,
  border: `1px solid ${colorBorder}`,
  borderRadius: 16,
  padding: 10,
  backdropFilter: 'blur(6px)',
})

export const textInput = style({
  flex: 1,
  padding: 10,
  borderRadius: 12,
  border: `1px solid ${colorBorder}`,
  background: 'transparent',
  color: colorText,
  outline: 'none',
})

export const iconButton = style({
  height: 38,
  width: 38,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 12,
  border: `1px solid ${colorBorder}`,
  background: 'transparent',
  cursor: 'pointer',
})


