import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

import OverlayApp from './OverlayApp'

const isOverlay = window.location.hash === '#/overlay';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {isOverlay ? <OverlayApp /> : <App />}
    </React.StrictMode>,
)
