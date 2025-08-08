export type ProposedFileEdit = {
  path: string
  fileExplanation: string
  diff: string
}

export type ProposedEdit = {
  id: string
  explanation: string
  files: ProposedFileEdit[]
}


