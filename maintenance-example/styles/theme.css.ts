import { createVar, style } from '@vanilla-extract/css'

export const colorBg = createVar()
export const colorCard = createVar()
export const colorBorder = createVar()
export const colorText = createVar()

export const appTheme = style({
  vars: {
    [colorBg]: '#0b1020',
    [colorCard]: 'rgba(255,255,255,0.06)',
    [colorBorder]: 'rgba(255,255,255,0.14)',
    [colorText]: '#e9eefc',
  },
  color: colorText,
  background: colorBg,
  minHeight: '100vh',
})


