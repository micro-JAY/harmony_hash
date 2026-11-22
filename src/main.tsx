import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppearanceProvider } from './appearance/AppearanceProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { restoreAppearance } from './lib/appearance'

const initialAppearance = restoreAppearance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider initialAppearance={initialAppearance}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AppearanceProvider>
  </StrictMode>,
)
