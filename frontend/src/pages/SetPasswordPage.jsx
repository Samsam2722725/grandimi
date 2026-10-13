import { useState, useEffect } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import { enregistrerPredictionServeur } from '../lib/prediction-serveur';
import '../styles/funnel.css';
import '../styles/auth-page.css';

/* « Paiement confirmé » : le premier écran après avoir payé.

   Même habillage que l'app (fond noir, Syne, orange) : c'est la première
   impression du client qui vient de payer. Un seul champ mot de passe avec
   « afficher » (plus de champ de confirmation), la règle des 8 caractères
   visible en permanence, et autoComplete="new-password" pour que le
   téléphone propose de l'enregistrer. */
function SetPasswordPage({ onAuthComplete, onSeConnecter }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Le champ e-mail ne se verrouille que si l'adresse est connue : Whop
     ne renvoie pas toujours customer_email, et le localStorage est vide
     quand le paiement s'est fait sur un autre appareil. */
  const [emailConnu, setEmailConnu] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // L'adresse de la page est nettoyée après un paiement : l'adresse Whop
    // a été mise de côté juste avant (App.jsx).
    const emailFromWhop =
      params.get('customer_email') || sessionStorage.getItem('grandimi:email_whop');
    const savedEmail = localStorage.getItem('userEmail');

    /* L'adresse saisie sur Grandimi passe AVANT celle renvoyée par Whop :
       c'est elle qui identifie le compte crédité. Préférer customer_email
       créait un compte neuf sans abonnement (constaté trois fois en
       production le 12/09/2026). Whop ne garde le dernier mot que quand
       on n'a rien en local. */
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
        throw new Error('Entre l’adresse avec laquelle tu viens de payer.');
      }
      if (password.length < 8) {
        throw new Error('Ton mot de passe doit faire au moins 8 caractères.');
      }

      const response = await apiClient.signup({ email, password });

      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);

      // Garder la prédiction complète du questionnaire si elle est là ;
      // sinon la reconstruire depuis la base (âge, sexe, poids compris).
      try {
        const predictions = await apiClient.getMyPredictions();
        enregistrerPredictionServeur(predictions, email);
      } catch {
        // Illisible : le plan retombera sur l'accueil, pas sur une page vide.
      }

      setLoading(false);
      onAuthComplete();
    } catch (err) {
      setError(err.message || 'La création du compte a échoué. Réessaie dans un instant.');
      setLoading(false);
    }
  };

  return (
    <div className="night auth-page auth-night pc-page">
      <div className="pc-conteneur">
        <p className="pc-marque">Grandimi</p>

        <div className="pc-ok" aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </div>
        <h1 className="pc-titre">Paiement confirmé</h1>
        <p className="pc-sous-titre">
          Dernière étape : choisis un mot de passe pour retrouver ton plan sur n’importe quel téléphone.
        </p>

        <form onSubmit={handleSubmit} className="pc-form">
          {error && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">✕</span>
              <div>
                {error}
                {/* Compte qui a déjà un mot de passe (onglet rechargé,
                    réabonnement) : une issue directe. */}
                {/existe déjà/i.test(error) && onSeConnecter && (
                  <>
                    {' '}
                    <button type="button" className="btn-tertiary" onClick={onSeConnecter}>
                      Se connecter
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {emailConnu ? (
            <div className="pc-email">
              <span className="pc-email-libelle">Ton compte</span>
              <span className="pc-email-valeur">{email}</span>
              {/* Champ caché : le gestionnaire de mots de passe du téléphone
                  associe ainsi le mot de passe à la bonne adresse. */}
              <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="celle utilisée pour le paiement"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="pc-mdp">
              <input
                id="password"
                name="password"
                type={voirMotDePasse ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                enterKeyHint="go"
                required
              />
              <button
                type="button"
                className="pc-voir"
                onClick={() => setVoirMotDePasse((v) => !v)}
                aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {voirMotDePasse ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            <p className={`pc-regle ${password.length >= 8 ? 'ok' : ''}`}>
              {password.length >= 8 ? '✓ ' : ''}8 caractères minimum
            </p>
          </div>

          <button type="submit" className="funnel-cta pc-cta" disabled={loading}>
            {loading ? <><Spinner />Création…</> : 'Accéder à mon plan'}
          </button>
        </form>

        <ul className="pc-liste">
          <li><Check size={16} aria-hidden="true" /> Paiement confirmé</li>
          <li><Check size={16} aria-hidden="true" /> Ton plan personnalisé est prêt</li>
        </ul>
      </div>
    </div>
  );
}

export default SetPasswordPage;
