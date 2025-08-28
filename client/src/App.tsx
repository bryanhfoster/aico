import { Routes, Route } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import CallPage from "./pages/CallPage";

function App() {
  return (
    <Routes>
      <Route path="/*" element={<ChatPage />} />
      <Route path="/call" element={<CallPage />} />
    </Routes>
  );
}

export default App;
