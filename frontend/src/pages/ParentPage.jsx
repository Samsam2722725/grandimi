import { useState } from 'react';
import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import '../styles/paywall.css';

/* Page ouverte par un parent depuis le lien partagé par son enfant
   (grandimi.com/?parent=<id du compte enfant>).

   Le parent paie avec SON email — c'est lui le client Whop — mais
   l'abonnement doit atterrir sur le compte de l'enfant. C'est
   `childUserId` qui porte cette information jusqu'au webhook.

   L'email de l'enfant n'est volontairement pas affiché : la page est
   accessible à qui possède le lien, l'y exposer permettrait de lire
   l'adresse d'un mineur à partir d'un simple identifiant. */

const FORMULE = {
  prix: '9,99',
  avantages: [
    'Un plan de croissance personnalisé sur 12 mois',
    'Les 5 guides : exercices, nutrition, sommeil',
    'Suivi des progrès et re-mesure chaque mois',
    'Résiliable en ligne à tout moment',
  ],
};

function ParentPage({ childUserId }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const peutPayer = emailValide && !loading;

  const lancerPaiement = async () => {
    setErreur(null);
    setLoading(true);

    try {
      const { checkout_url: checkoutURL } = await apiClient.createCheckout({
        email,
        childUserId,
      });

      if (!checkoutURL) {
        throw new Error("Le serveur n'a pas renvoyé d'URL de paiement.");
      }

      window.location.href = checkoutURL;
    } catch (err) {
      setErreur(
        err.message || "Impossible d'ouvrir la page de paiement. Réessayez dans un instant.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="paywall-page">
      <header className="paywall-header">
        <h1>Votre enfant vous demande de régler son plan</h1>
        <p className="subtitle">
          Vous payez depuis votre propre adresse e-mail. L'accès, lui, s'ouvre
          automatiquement sur le compte que votre enfant a déjà créé — il n'a rien à
          refaire, et vous n'avez pas de compte à créer.
        </p>
      </header>

      <section className="payment-section">
        <div className="payment-box">
          <h2>Ce que Grandimi fait</h2>
          <p>
            Votre enfant a répondu à un questionnaire (âge, taille, poids, votre taille et
            celle de l'autre parent) et a reçu <strong>gratuitement</strong> une estimation
            de sa taille adulte, avec sa marge d'erreur. Cette partie est et reste gratuite.
          </p>
          <p>
            Ce qui est payant, c'est la suite : un plan sur 12 mois pour l'aider à atteindre
            son potentiel — sommeil, alimentation, activité physique.
          </p>

          <h2>Ce que contient l'abonnement</h2>
          <ul className="features">
            {FORMULE.avantages.map((avantage) => (
              <li key={avantage}>
                <span className="check">✓</span>
                {avantage}
              </li>
            ))}
          </ul>

          <div className="price">
            <span className="amount">{FORMULE.prix} €</span>
            <span className="duration">/mois</span>
          </div>

          <div className="form-group">
            <label htmlFor="email-parent">Votre e-mail</label>
            <input
              id="email-parent"
              type="email"
              autoComplete="email"
              placeholder="vous@email.com"
              value={email}
              onChange={(evenement) => setEmail(evenement.target.value)}
            />
            <p className="form-helper">
              Sert à votre reçu et à gérer ou résilier l'abonnement. C'est bien le compte de
              votre enfant qui recevra l'accès.
            </p>
          </div>

          {erreur && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">!</span>
              <p>{erreur}</p>
            </div>
          )}

          <button
            className="btn-primary btn-full btn-large"
            onClick={lancerPaiement}
            disabled={!peutPayer}
          >
            {loading ? (
              <>
                <Spinner />
                Redirection…
              </>
            ) : (
              `Régler l'abonnement — ${FORMULE.prix} €/mois`
            )}
          </button>

          <div className="security-note">
            <span>🔒</span> Paiement traité par Whop. Grandimi ne voit ni ne stocke votre
            carte bancaire.
          </div>
        </div>
      </section>

      <section className="paywall-faq">
        <h2>Questions fréquentes</h2>
        <div className="faq-items">
          <details className="faq-item">
            <summary>Dois-je créer un compte ?</summary>
            <p>
              Non. Vous renseignez seulement votre e-mail pour le paiement. L'accès s'ouvre
              sur le compte que votre enfant a créé.
            </p>
          </details>

          <details className="faq-item">
            <summary>Comment mon enfant y accède-t-il ensuite ?</summary>
            <p>
              Automatiquement : dès le paiement confirmé, il retrouve son plan en se
              reconnectant à son compte. Rien à saisir de votre côté.
            </p>
          </details>

          <details className="faq-item">
            <summary>Puis-je résilier ?</summary>
            <p>
              Oui, en ligne et à tout moment depuis votre espace Whop. L'accès reste actif
              jusqu'à la fin de la période déjà réglée.
            </p>
          </details>

          <details className="faq-item">
            <summary>Pourquoi est-ce à moi de payer ?</summary>
            <p>
              Grandimi s'adresse aux 8-18 ans. L'abonnement est donc souscrit par un parent
              ou un adulte responsable, jamais par l'enfant seul.
            </p>
          </details>

          <details className="faq-item">
            <summary>Que devient l'estimation si je ne paie pas ?</summary>
            <p>
              Elle reste accessible et gratuite. Seul le plan sur 12 mois est concerné par
              l'abonnement.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

export default ParentPage;
