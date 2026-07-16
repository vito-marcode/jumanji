import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import MainDisplay from './pages/MainDisplay'
import ClientDevice from './pages/ClientDevice'
import { TransportProvider } from './hooks/useTransport'
import { I18nProvider } from './i18n'

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/main/:sessionCode"
          element={
            <TransportProvider role="main">
              <MainDisplay />
            </TransportProvider>
          }
        />
        <Route
          path="/client/:sessionCode"
          element={
            <TransportProvider role="client">
              <ClientDevice />
            </TransportProvider>
          }
        />
      </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}
