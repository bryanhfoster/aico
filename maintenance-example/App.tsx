import './App.css'
import { AppMachineProvider } from './state/AppMachineContext'
import { FlowManager } from './components/FlowManager'
import { GODProvider } from './GOD/context'

function App() {
  return (
    <AppMachineProvider>
      <GODProvider>
        <FlowManager />
      </GODProvider>
    </AppMachineProvider>
  )
}

export default App
