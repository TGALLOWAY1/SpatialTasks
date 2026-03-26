import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthGate } from './components/Auth/AuthGate.tsx'
import { ErrorBoundary } from './components/UI/ErrorBoundary.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthGate>
                <App />
            </AuthGate>
        </ErrorBoundary>
    </React.StrictMode>,
)
