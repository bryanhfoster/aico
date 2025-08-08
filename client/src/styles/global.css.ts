import { globalStyle } from '@vanilla-extract/css';

// Reset-like minimal globals
globalStyle('html, body, #root', {
  margin: 0,
  padding: 0,
  height: '100%'
});

globalStyle('body', {
  fontFamily:
    'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  lineHeight: 1.4
});


