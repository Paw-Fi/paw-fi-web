/// <reference types="vinxi/types/client" />
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import { createRouter } from './router'
import { ReduxProvider } from './providers/ReduxProvider'

const router = createRouter()

hydrateRoot(
  document, 
  <ReduxProvider>
    <StartClient router={router} />
  </ReduxProvider>
)
