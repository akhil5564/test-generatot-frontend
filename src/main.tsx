
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@/store'
import App from './App.tsx'
import './index.css'

// 🎨 LOADING COMPONENT
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    <p className="ml-4 text-gray-600">Loading your session...</p>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
