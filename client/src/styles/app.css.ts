import { style } from '@vanilla-extract/css';
import { appTheme, colorBackground, colorBorder, colorText, spacing8, spacing12, spacing16 } from './tokens.css.ts';

export const appRoot = style([
  appTheme,
  {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: colorBackground,
    color: colorText
  }
]);

export const header = style({
  padding: spacing8,
  borderBottom: `1px solid ${colorBorder}`,
  display: 'flex',
  gap: spacing16,
  alignItems: 'center'
});

export const mainArea = style({
  flex: 1,
  overflow: 'auto',
  padding: spacing12
});

export const messageRow = style({
  marginBottom: spacing8,
  display: 'flex'
});

export const messageBubble = style({
  padding: '8px 12px',
  borderRadius: 8,
  maxWidth: 560
});

export const bubbleMeta = style({
  fontSize: 12,
  opacity: 0.6
});

export const footerForm = style({
  display: 'flex',
  padding: spacing8,
  gap: spacing8,
  borderTop: `1px solid ${colorBorder}`
});


