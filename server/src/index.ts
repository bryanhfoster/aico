import Fastify from 'fastify'
import cors from '@fastify/cors'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ProposalResponse, DiffResponse } from './types'

const execAsync = promisify(exec)

const PORT = Number(process.env.PORT ?? 4399)
// Resolve repo root two levels up from this server dir (god-server/)
const repoRoot = path.resolve(process.cwd(), '..')
const flowClientRoot = path.join(repoRoot, 'flow-client')

const app = Fastify()
await app.register(cors, { origin: true })

app.get('/health', async () => ({ ok: true }))

app.post('/gm/proposal', async (): Promise<ProposalResponse> => {
  // Static proposal mirroring the client demo, returned from server for real wiring
  return {
    id: 'demo-1',
    explanation: 'Replace the chat send button icon with a clearer arrow and add aria-label for accessibility.',
    files: [
      {
        path: 'src/components/FlowManager.tsx',
        fileExplanation: 'Swap the send button character for a rightward triangle and add aria-label.',
        diff: `--- a/src/components/FlowManager.tsx\n+++ b/src/components/FlowManager.tsx\n@@\n-      <button type=\"submit\" className={chatStyles.iconButton} title=\"Send\">\n-        ➤\n-      </button>\n+      <button type=\"submit\" className={chatStyles.iconButton} title=\"Send\" aria-label=\"Send message\">\n+        ▶\n+      </button>\n`,
      },
    ],
  }
})

app.post('/gm/branch', async (req, reply) => {
  const branchName = (req.body as { branch?: string })?.branch ?? 'gm/demo-1'
  try {
    await execAsync(`git checkout -b ${branchName}`, { cwd: repoRoot })
    return { ok: true, branch: branchName }
  } catch (err) {
    // If branch exists, try switching
    try {
      await execAsync(`git checkout ${branchName}`, { cwd: repoRoot })
      return { ok: true, branch: branchName, existed: true }
    } catch (e) {
      reply.code(500)
      return { ok: false, error: String(e) }
    }
  }
})

app.post('/gm/apply', async (req, reply) => {
  // Minimal targeted edit for demo proposal: update FlowManager.tsx button markup
  const target = path.join(flowClientRoot, 'src/components/FlowManager.tsx')
  try {
    const content = await readFile(target, 'utf8')
    // Replace the send button block. Keep this robust to whitespace
    const replaced = content.replace(
      /<button\s+type=\"submit\"[^>]*title=\"Send\"[^>]*>[\s\S]*?<\/button>/,
      `<button type=\"submit\" className={chatStyles.iconButton} title=\"Send\" aria-label=\"Send message\">\n        ▶\n      </button>`
    )
    if (replaced === content) {
      return { ok: false, error: 'PATTERN_NOT_FOUND' }
    }
    await writeFile(target, replaced, 'utf8')
    // stage file
    await execAsync(`git add ${path.relative(repoRoot, target)}`, { cwd: repoRoot })
    return { ok: true }
  } catch (e) {
    reply.code(500)
    return { ok: false, error: String(e) }
  }
})

app.get('/gm/diff', async (): Promise<DiffResponse> => {
  const { stdout } = await execAsync('git --no-pager diff', { cwd: repoRoot })
  return { diff: stdout }
})

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`god-server listening on ${PORT} (root: ${repoRoot})`)
})


