import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import '../styles/account-page.css';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPrix(valeur) {
  return Number(valeur || 0).toFixed(2).replace('.', ',');
}

/* "Mon compte -> Abonnement" : offre en cours, prochaine date/montant de
   paiement, bouton de résiliation. Le succès n'est affiché qu'après la
   réponse positive du backend (lui-même dépendant de la confirmation de
   Whop) — jamais de façon optimiste, pour ne jamais annoncer une
   résiliation qui n'aurait pas réellement eu lieu côté facturation. */
function AccountPage({ onBackHome }) {
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [abonnement, setAbonnement] = useState(null);

  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [resiliationEnCours, setResiliationEnCours] = useState(false);
  const [resiliationErreur, setResiliationErreur] = useState(null);
  const [resiliationReussie, setResiliationReussie] = useState(null);

  useEffect(() => {
    let annule = false;
    apiClient
      .getSubscription()
      .then((res) => {
        if (!annule) setAbonnement(res);
      })
      .catch((err) => {
        if (!annule) setErreur(err.message || "Impossible de charger l'abonnement.");
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const confirmerResiliation = async () => {
    setResiliationEnCours(true);
    setResiliationErreur(null);
    try {
      const res = await apiClient.cancelSubscription();
      setResiliationReussie({
        accessUntil: res.access_until || abonnement?.next_payment_date,
      });
      setAbonnement((precedent) => precedent && { ...precedent, cancel_at_period_end: true });
      setConfirmationOuverte(false);
    } catch (err) {
      // Message explicite plutôt que générique : si WHOP_API_KEY n'est
      // pas configuré, le backend renvoie une raison précise, pas un
      // 500 muet — l'utilisateur (ou l'équipe support) doit pouvoir la
      // lire telle quelle.
      setResiliationErreur(
        err.message || 'La résiliation a échoué. Réessaie dans un instant.',
      );
    } finally {
      setResiliationEnCours(false);
    }
  };

  if (loading) {
    return (
      <div className="account-page">
        <Spinner size="page" label="Chargement de ton abonnement..." />
      </div>
    );
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <button className="btn-tertiary" onClick={onBackHome}>
          ← Accueil
        </button>
        <h1>Mon compte</h1>
      </header>

      <section className="account-section">
        <h2>Abonnement</h2>

        {erreur && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">!</span>
            <p>{erreur}</p>
          </div>
        )}

        {!erreur && abonnement && !abonnement.has_subscription && (
          <p className="account-empty">Tu n'as pas d'abonnement actif.</p>
        )}

        {!erreur && abonnement && abonnement.has_subscription && (
          <div className="account-card">
            <div className="account-row">
              <span className="account-label">Offre actuelle</span>
              <span className="account-value">
                {abonnement.plan_label} — {formatPrix(abonnement.price_eur)} €
                {abonnement.plan_key === 'annual' ? '/an' : '/mois'}
              </span>
            </div>

            <div className="account-row">
              <span className="account-label">
                {abonnement.cancel_at_period_end ? "Accès jusqu'au" : 'Prochain paiement'}
              </span>
              <span className="account-value">
                {abonnement.cancel_at_period_end
                  ? formatDate(abonnement.next_payment_date)
                  : `${formatPrix(abonnement.price_eur)} € le ${formatDate(
                      abonnement.next_payment_date,
                    )}`}
              </span>
            </div>

            {abonnement.cancel_at_period_end ? (
              <div className="alert alert-info">
                <div>
                  Résiliation prise en compte. Ton accès reste actif jusqu'au{' '}
                  <strong>{formatDate(abonnement.next_payment_date)}</strong>, aucun
                  renouvellement ne sera prélevé ensuite.
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary account-cancel-btn"
                onClick={() => setConfirmationOuverte(true)}
              >
                Résilier mon abonnement
              </button>
            )}

            {resiliationErreur && (
              <div className="alert alert-error" role="alert">
                <span className="alert-icon">!</span>
                <p>{resiliationErreur}</p>
              </div>
            )}

            {resiliationReussie && (
              <div className="alert alert-success" role="status">
                <div>
                  Résiliation confirmée. Ton accès reste actif jusqu'au{' '}
                  <strong>{formatDate(resiliationReussie.accessUntil)}</strong>.
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {confirmationOuverte && (
        <div className="account-modal-overlay" role="dialog" aria-modal="true">
          <div className="account-modal">
            <h2>Confirmer la résiliation ?</h2>
            <p>
              Offre <strong>{abonnement.plan_label}</strong> —{' '}
              {formatPrix(abonnement.price_eur)} €
              {abonnement.plan_key === 'annual' ? '/an' : '/mois'}.
            </p>
            <p>
              Le renouvellement s'arrêtera, mais ton accès reste actif jusqu'au{' '}
              <strong>{formatDate(abonnement.next_payment_date)}</strong>.
            </p>

            <div className="account-modal-actions">
              <button
                type="button"
                className="btn-tertiary"
                onClick={() => setConfirmationOuverte(false)}
                disabled={resiliationEnCours}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmerResiliation}
                disabled={resiliationEnCours}
              >
                {resiliationEnCours ? (
                  <>
                    <Spinner />
                    Résiliation...
                  </>
                ) : (
                  'Confirmer la résiliation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountPage;
