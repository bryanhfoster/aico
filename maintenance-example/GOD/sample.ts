import type { ProposedEdit } from './types'

export const sampleProposal: ProposedEdit = {
  id: 'demo-1',
  explanation: 'Replace the chat send button icon with a clearer arrow and add aria-label for accessibility.',
  files: [
    {
      path: 'src/components/chat/styles.css.ts',
      fileExplanation: 'No change required; styles remain the same.',
      diff: `--- a/src/components/chat/styles.css.ts\n+++ b/src/components/chat/styles.css.ts\n@@\n-// no-op in demo\n+// no style changes in demo\n`,
    },
    {
      path: 'src/components/FlowManager.tsx',
      fileExplanation: 'Swap the send button character for a rightward triangle and add aria-label.',
      diff: `--- a/src/components/FlowManager.tsx\n+++ b/src/components/FlowManager.tsx\n@@\n-      <button type=\"submit\" className={chatStyles.iconButton} title=\"Send\">\n-        ➤\n-      </button>\n+      <button type=\"submit\" className={chatStyles.iconButton} title=\"Send\" aria-label=\"Send message\">\n+        ▶\n+      </button>\n`,
    },
  ],
}


