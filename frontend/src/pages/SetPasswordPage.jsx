import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import '../styles/auth-page.css';

function SetPasswordPage({ onAuthComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Le champ e-mail était verrouillé en toutes circonstances, y compris
     quand aucune adresse n'avait été retrouvée : le client venait de
     payer et se retrouvait devant un champ vide, impossible à remplir,
     sans aucune issue. Ce n'est pas un cas tordu — Whop ne renvoie pas
     customer_email de lui-même, et le localStorage est vide dès que le
     paiement s'est fait sur un autre appareil que le questionnaire.
     Le champ ne se verrouille donc plus que si l'adresse est connue. */
  const [emailConnu, setEmailConnu] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromWhop = params.get('customer_email');
    const savedEmail = localStorage.getItem('userEmail');

    /* L'adresse saisie sur Grandimi passe AVANT celle renvoyée par Whop.

         C'est elle qui identifie le compte crédité : /api/v1/checkout
         résout le compte depuis cette adresse et transmet son
         identifiant à Whop (metadata[grandimi_user_id]), que le webhook
         relit pour accorder le premium.

         customer_email, lui, est l'adresse du COMPTE WHOP du payeur.
         Elle n'a aucune raison d'être la même — on paie depuis un
         compte Whop ouvert avec une autre adresse que celle tapée dans
         le questionnaire. En la préférant, cet écran créait un compte
         tout neuf, sans abonnement, pendant que le premium venait
         d'atterrir sur le bon : le client payait puis lisait
         « abonnement requis ».

         Constaté trois fois en production le 12/09/2026.

         Whop garde le dernier mot uniquement quand on n'a rien en
         local — paiement fait depuis un autre appareil, où il ne reste
         que ce que l'URL de retour transporte. */
    if (savedEmail) {
      setEmail(savedEmail);
      setEmailConnu(true);
    } else if (emailFromWhop) {
      setEmail(emailFromWhop);
      setEmailConnu(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email) {
        throw new Error('Email manquant');
      }

      if (!password || !confirmPassword) {
        throw new Error('Veuillez entrer un mot de passe');
      }

      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (password.length < 8) {
        throw new Error('Le mot de passe doit avoir au moins 8 caractères');
      }

      // Créer le compte avec le mot de passe choisi
      const response = await apiClient.signup({
        email,
        password,
      });

      // Connecter l'utilisateur
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);

      // Charger les prédictions depuis le backend
      const predictions = await apiClient.getMyPredictions();
      if (predictions && predictions.length > 0) {
        const latestPrediction = predictions[0];
        localStorage.setItem('predictionData', JSON.stringify({
          predicted_height_cm: latestPrediction.predicted_height,
          confidence_range: {
            min: latestPrediction.confidence_min,
            max: latestPrediction.confidence_max,
          },
          confidence_level: latestPrediction.confidence_level,
          current_height: latestPrediction.height_cm,
          email: email,
        }));
      }

      setLoading(false);
      onAuthComplete();
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-night">
      <div className="auth-container">
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Grandimi</span>
        </div>

        <div className="auth-card">
          <h1>Bienvenue! 🎉</h1>
          <p className="subtitle">Créez votre mot de passe pour accéder à votre plan</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">✕</span>
                <div>{error}</div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailConnu}
                readOnly={emailConnu}
                required
                autoComplete="email"
                placeholder={emailConnu ? undefined : 'celle utilisée pour le paiement'}
                className={emailConnu ? 'input-disabled' : undefined}
              />
              <p className="form-helper">
                {emailConnu
                  ? 'Email du paiement (non modifiable)'
                  : 'Saisis l’adresse avec laquelle tu viens de payer.'}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 caractères"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer mot de passe</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                required
              />
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? <><Spinner />Création du compte...</> : 'Créer mon compte et accéder au plan'}
            </button>
          </form>

          <div className="auth-footer">
            <p style={{ fontSize: '0.9rem', textAlign: 'center', color: '#666' }}>
              ✓ Paiement confirmé<br/>
              ✓ Prêt à accéder à votre plan personnalisé
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetPasswordPage;
