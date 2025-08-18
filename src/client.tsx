/// <reference types="vinxi/types/client" />
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import { createRouter } from './router'
import { ReduxProvider } from './providers/ReduxProvider'
import { AIChatProvider } from './contexts/ai-chat-context'

const router = createRouter()

hydrateRoot(
  document, 
  <ReduxProvider>
    <AIChatProvider>
      <StartClient router={router} />
    </AIChatProvider>
  </ReduxProvider>
)
