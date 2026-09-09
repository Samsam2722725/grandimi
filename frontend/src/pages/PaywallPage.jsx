import { useState } from 'react';
import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import '../styles/paywall.css';

/* Formule unique à 9,99 €/mois.
   Le backend n'expose qu'un seul produit Whop (productSlug codé en dur
   dans whop_handlers.go) : proposer 3 formules ici enverrait les trois
   vers le même paiement. Une formule = une vérité. */
const FORMULE = {
  nom: 'Plan de croissance',
  prix: '9,99',
  periode: '/mois',
  avantages: [
    'Ton plan personnalisé sur 12 mois',
    'Les 5 guides : exercices, nutrition, sommeil',
    'Suivi des progrès et re-mesure mensuelle',
    'Résiliable en ligne à tout moment',
  ],
};

function PaywallPage({ onBackHome }) {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const peutPayer = emailValide && !loading;

  /**
   * Redirige vers la page de paiement hébergée par Whop.
   *
   * Le frontend ne voit JAMAIS de données bancaires : c'est Whop qui
   * les collecte sur son propre domaine. La version précédente affichait
   * des champs « numéro de carte » et « CVC » en clair — une violation
   * PCI-DSS — et validait le paiement avec un setTimeout de 2 s, ce qui
   * offrait le premium à quiconque cliquait.
   *
   * L'accès n'est PAS accordé ici : il l'est par le webhook Whop côté
   * serveur, après paiement réel.
   */
  const lancerPaiement = async () => {
    setErreur(null);
    setLoading(true);

    try {
      const utilisateur = JSON.parse(localStorage.getItem('user') || '{}');
      const { checkout_url: checkoutURL } = await apiClient.createCheckout({
        email,
        userId: utilisateur.id,
      });

      if (!checkoutURL) {
        throw new Error("Le serveur n'a pas renvoyé d'URL de paiement.");
      }

      // On garde l'e-mail pour pouvoir vérifier le statut au retour.
      localStorage.setItem('user', JSON.stringify({ ...utilisateur, email }));

      window.location.href = checkoutURL;
    } catch (err) {
      setErreur(
        err.message || "Impossible d'ouvrir la page de paiement. Réessaie dans un instant.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="paywall-page">
      <header className="paywall-header">
        <button className="btn-tertiary" onClick={onBackHome}>
          ← Retour
        </button>
        <h1>Débloquer ton plan complet</h1>
        <p className="subtitle">
          Ton estimation reste gratuite. Le plan sur 12 mois, lui, est payant.
        </p>
      </header>

      <section className="payment-section">
        <div className="payment-box">
          <h2>{FORMULE.nom}</h2>

          <div className="price">
            <span className="amount">{FORMULE.prix} €</span>
            <span className="duration">{FORMULE.periode}</span>
          </div>

          <ul className="features">
            {FORMULE.avantages.map((avantage) => (
              <li key={avantage}>
                <span className="check">✓</span>
                {avantage}
              </li>
            ))}
          </ul>

          <div className="form-group">
            <label htmlFor="email-paiement">E-mail</label>
            <input
              id="email-paiement"
              type="email"
              autoComplete="email"
              placeholder="ton@email.com"
              value={email}
              disabled
              readOnly
            />
            <p className="form-helper">
              Email du questionnaire (non modifiable). Aucune donnée bancaire ne transite
              par Grandimi.
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
              `S'abonner — ${FORMULE.prix} €/mois`
            )}
          </button>

          <div className="security-note">
            <span>🔒</span> Paiement traité par Whop. Grandimi ne voit ni ne stocke ta
            carte.
          </div>

          <p className="legal-text">
            En continuant, tu acceptes nos <a href="#terms">Conditions d'utilisation</a> et
            notre <a href="#privacy">Politique de confidentialité</a>. Résiliable en ligne
            à tout moment.
          </p>
        </div>
      </section>

      <section className="paywall-faq">
        <h2>Questions fréquentes</h2>
        <div className="faq-items">
          <details className="faq-item">
            <summary>Puis-je annuler mon abonnement ?</summary>
            <p>
              Oui, en ligne et à tout moment, depuis ton espace Whop. L'accès reste actif
              jusqu'à la fin de la période déjà payée.
            </p>
          </details>

          <details className="faq-item">
            <summary>Qui traite le paiement ?</summary>
            <p>
              Whop. Tu es redirigé vers sa page sécurisée : tes données bancaires ne
              passent jamais par Grandimi, et nous ne les stockons pas.
            </p>
          </details>

          <details className="faq-item">
            <summary>L'estimation est-elle vraiment gratuite ?</summary>
            <p>
              Oui. Le questionnaire et ton estimation de taille adulte le restent. Seul le
              plan personnalisé sur 12 mois est payant.
            </p>
          </details>

          <details className="faq-item">
            <summary>J'ai moins de 18 ans, puis-je m'abonner ?</summary>
            <p>
              Pas seul : la souscription doit être faite par un parent ou un adulte
              responsable. Tu peux en revanche utiliser l'estimation gratuite.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

export default PaywallPage;
