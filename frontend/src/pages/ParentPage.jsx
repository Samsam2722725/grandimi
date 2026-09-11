import { useState, useEffect } from 'react';
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

const AVANTAGES = [
  'Un plan de croissance personnalisé, renouvelé chaque mois',
  'Les 5 guides : exercices, nutrition, sommeil',
  'Suivi des progrès et re-mesure chaque mois',
  'Résiliable en ligne à tout moment',
];

/* Mêmes deux offres que la paywall enfant, mêmes valeurs par défaut :
   getPlans() ne fait que les confirmer, le montant réel restant décidé
   par le plan Whop choisi côté serveur. */
const PLANS_PAR_DEFAUT = {
  monthly: { key: 'monthly', label: 'Mensuel', price_eur: 4.99, interval: 'month' },
  annual: { key: 'annual', label: 'Annuel', price_eur: 29.99, interval: 'year' },
};
const COUT_DOUZE_MENSUALITES = 12 * PLANS_PAR_DEFAUT.monthly.price_eur;

function ParentPage({ childUserId }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [planChoisi, setPlanChoisi] = useState('monthly');
  const [plans, setPlans] = useState(PLANS_PAR_DEFAUT);

  useEffect(() => {
    let annule = false;
    apiClient
      .getPlans()
      .then((res) => {
        if (annule || !Array.isArray(res.plans)) return;
        const parClef = {};
        for (const p of res.plans) parClef[p.key] = p;
        setPlans((precedent) => ({ ...precedent, ...parClef }));
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  const economieAnnuelle = COUT_DOUZE_MENSUALITES - plans.annual.price_eur;
  const pourcentageEconomie = Math.round((economieAnnuelle / COUT_DOUZE_MENSUALITES) * 100);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const peutPayer = emailValide && !loading;

  const lancerPaiement = async () => {
    setErreur(null);
    setLoading(true);

    try {
      const { checkout_url: checkoutURL } = await apiClient.createCheckout({
        email,
        childUserId,
        plan: planChoisi,
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
            Ce qui est payant, c'est la suite : un accompagnement pour l'aider à atteindre
            son potentiel — sommeil, alimentation, activité physique. Un nouveau plan
            adapté à sa progression lui est remis chaque mois, que l'abonnement soit
            réglé mensuellement ou en une fois pour l'année.
          </p>

          <h2>Ce que contient l'abonnement</h2>
          <ul className="features">
            {AVANTAGES.map((avantage) => (
              <li key={avantage}>
                <span className="check">✓</span>
                {avantage}
              </li>
            ))}
          </ul>

          <h2>Choisissez la formule</h2>
          <div className="plans-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-16)' }}>
            <div
              className={`plan-card ${planChoisi === 'monthly' ? 'selected' : ''}`}
              onClick={() => setPlanChoisi('monthly')}
              role="radio"
              aria-checked={planChoisi === 'monthly'}
              tabIndex={0}
            >
              <h2>Mensuel</h2>
              <div className="price">
                <span className="amount">{plans.monthly.price_eur.toFixed(2).replace('.', ',')} €</span>
                <span className="duration">/mois</span>
              </div>
            </div>

            <div
              className={`plan-card ${planChoisi === 'annual' ? 'selected' : ''}`}
              onClick={() => setPlanChoisi('annual')}
              role="radio"
              aria-checked={planChoisi === 'annual'}
              tabIndex={0}
            >
              {planChoisi === 'annual' && <span className="popular-badge">Choisi</span>}
              <h2>Annuel</h2>
              <div className="price">
                <span className="amount">{plans.annual.price_eur.toFixed(2).replace('.', ',')} €</span>
                <span className="duration">/an</span>
              </div>
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-canopy-green)', fontWeight: 600, margin: 0 }}>
                Économisez près de {pourcentageEconomie} % par rapport à 12 mensualités à{' '}
                {plans.monthly.price_eur.toFixed(2).replace('.', ',')} €.
              </p>
            </div>
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
              `Régler l'abonnement — ${plans[planChoisi].price_eur.toFixed(2).replace('.', ',')} €${
                plans[planChoisi].interval === 'year' ? '/an' : '/mois'
              }`
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
              Elle reste accessible et gratuite. Seul l'accompagnement (mensuel ou annuel)
              est concerné par l'abonnement.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

export default ParentPage;
