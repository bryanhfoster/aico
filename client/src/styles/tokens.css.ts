import { createVar, style } from '@vanilla-extract/css';

// Simple design tokens
export const colorBackground = createVar();
export const colorBorder = createVar();
export const colorText = createVar();
export const colorBubbleUser = createVar();
export const colorBubbleAssistant = createVar();

export const spacing0 = '0px';
export const spacing4 = '4px';
export const spacing8 = '8px';
export const spacing12 = '12px';
export const spacing16 = '16px';
export const spacing24 = '24px';

export const appTheme = style({
  vars: {
    [colorBackground]: '#ffffff',
    [colorBorder]: '#dddddd',
    [colorText]: '#111111',
    [colorBubbleUser]: '#dbeafe', // blue-100
    [colorBubbleAssistant]: '#eeeeee'
  }
});


