import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import MainDisplay from './pages/MainDisplay'
import ClientDevice from './pages/ClientDevice'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/main/:sessionCode" element={<MainDisplay />} />
        <Route path="/client/:sessionCode" element={<ClientDevice />} />
      </Routes>
    </BrowserRouter>
  )
}
