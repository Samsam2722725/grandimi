import { useState, useEffect } from 'react'
import '../styles/paywall.css'
import apiClient from '../lib/api'

export default function Paywall({ onContinue, onParentPay }) {
  const [showFaq, setShowFaq] = useState(false)
  const [showParentOption, setShowParentOption] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [parentEmail, setParentEmail] = useState('')

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail') || ''
    setEmail(savedEmail)
  }, [])

  const faqs = [
    {
      q: "Comment fonctionne l'estimation de taille?",
      a: "Grandimi utilise des équations de prédiction scientifiques (Khamis-Roche) combinées avec tes habitudes quotidiennes pour estimer ta taille finale."
    },
    {
      q: "Mes données sont-elles sécurisées?",
      a: "Oui, toutes tes données sont chiffrées et stockées de manière sécurisée. Nous ne vendons jamais tes informations."
    },
    {
      q: "Puis-je annuler mon abonnement?",
      a: "Oui, tu peux annuler à tout moment sans frais supplémentaires."
    },
    {
      q: "Y a-t-il une garantie?",
      a: "Oui, si tu n'es pas satisfait dans les 30 jours, nous te remboursons intégralement."
    },
  ]

  const handlePlan = async (plan) => {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await apiClient.createCheckout({
        email,
        userId: user.id,
        plan
      })
      if (res.checkout_url) {
        window.location.href = res.checkout_url
      }
    } catch (err) {
      console.error("Erreur checkout:", err)
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (onContinue) onContinue()
  }

  return (
    <div className="paywall">
      <div className="paywall-header">
        <h1>Choisir ton plan</h1>
        <div className="paywall-rating">⭐⭐⭐⭐⭐</div>
        <p className="paywall-testimonial">
          "L'app m'a vraiment aidé à comprendre comment grandir. Les recommandations basées sur mon mode de vie sont exactes!"
        </p>
        <p className="paywall-author">- utilisateur Grandimi</p>
      </div>

      <div className="paywall-pricing">
        <div className="price-card featured">
          <div className="price-badge">Populaire</div>
          <h2>Plan Annuel</h2>
          <div className="price-amount">39,99€<span className="price-period">/an</span></div>
          <div className="price-save">Économise 25%</div>
          <button className="paywall-btn primary" onClick={() => handlePlan('annual')} disabled={loading || !email}>
            {loading ? 'Redirection...' : 'Commencer maintenant'}
          </button>
          <p className="price-billing">Facturé 39,99€ par an</p>
        </div>

        <div className="price-card">
          <h2>Plan Mensuel</h2>
          <div className="price-amount">4,99€<span className="price-period">/mois</span></div>
          <button className="paywall-btn secondary" onClick={() => handlePlan('monthly')} disabled={loading || !email}>
            {loading ? 'Redirection...' : 'Choisir le plan mensuel'}
          </button>
        </div>
      </div>

      <div className="paywall-options">
        <button
          className="paywall-option-btn"
          onClick={() => setShowParentOption(!showParentOption)}
        >
          👨‍👩‍👦 Faire payer un parent
        </button>
        {showParentOption && (
          <div className="parent-payment-section">
            <p>Un de tes parents peut payer pour toi. On leur envoie un lien sécurisé.</p>
            <input
              type="email"
              placeholder="Email du parent"
              className="parent-email-input"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
            />
            <button
              className="paywall-btn primary"
              onClick={() => {
                if (parentEmail && onParentPay) {
                  const user = JSON.parse(localStorage.getItem('user') || '{}')
                  localStorage.setItem('grandimi:paiement_pour', user.id)
                  onParentPay(parentEmail)
                }
              }}
            >
              Envoyer le lien parent
            </button>
          </div>
        )}
      </div>

      <div className="paywall-faq">
        <button
          className="faq-toggle"
          onClick={() => setShowFaq(!showFaq)}
        >
          {showFaq ? '▼' : '▶'} Questions fréquentes
        </button>
        {showFaq && (
          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="paywall-footer">
        <button className="paywall-skip" onClick={handleSkip}>
          Continuer sans payer
        </button>
        <p className="paywall-guarantee">✓ Garantie 30 jours satisfait ou remboursé</p>
      </div>
    </div>
  )
}
