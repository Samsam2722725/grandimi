import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics'

/* POSTHOG APRES L AFFICHAGE, PAS PENDANT.

   posthog-js voyage dans le paquet d'entree et s'initialise avant le
   premier rendu, alors qu'il ne sert a rien tant que personne n'a rien
   fait. Il tire ensuite six scripts (sondages, capture d'exceptions,
   dead clicks) qui se disputent la bande passante avec le JavaScript
   qui, lui, conditionne l'affichage.

   Rien n'est perdu : les evenements du tunnel partent vers notre propre
   base par sendBeacon (lib/analytics.js), independamment de PostHog. Ce
   qui est differe ici, c'est la couche d'analyse tierce, pas la mesure
   sur laquelle on prend nos decisions. */
if (typeof window !== 'undefined' && window.requestIdleCallback) {
  window.requestIdleCallback(() => initAnalytics(), { timeout: 3000 })
} else {
  setTimeout(() => initAnalytics(), 1200)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
