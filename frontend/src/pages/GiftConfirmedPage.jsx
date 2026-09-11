import '../styles/paywall.css';

/* Écran affiché à un parent qui revient de Whop après avoir payé depuis
   le lien partagé par son enfant. Aucun compte n'est créé ici : l'accès a
   déjà été appliqué au compte de l'enfant par le webhook, avant même que
   cette page ne s'affiche.

   Sans cet écran, le parent atterrissait sur "Créez votre mot de passe"
   avec sa propre adresse — ce qui lui créait un compte inutile, jamais
   premium, pendant que l'enfant ne recevait aucune invite à se
   connecter. */
function GiftConfirmedPage({ onBackHome }) {
  return (
    <div className="paywall-page">
      <section className="payment-section">
        <div className="payment-box" style={{ textAlign: 'center' }}>
          <h1>Paiement confirmé 🎉</h1>
          <p>
            Merci ! L'abonnement est activé — mais pas sur ce compte-ci. Vous avez payé
            depuis le lien partagé par votre enfant, donc l'accès s'ouvre directement sur
            <strong> son</strong> compte.
          </p>
          <p>
            Rien à faire de votre côté : aucun compte n'a été créé pour vous, et vous
            n'en avez pas besoin.
          </p>

          <div className="alert alert-info" style={{ margin: '24px 0', textAlign: 'left' }}>
            <div>
              <strong>Pour votre enfant :</strong> qu'il retourne sur grandimi.com. Si son
              plan ne s'affiche pas immédiatement, l'écran pour créer son mot de passe
              apparaîtra automatiquement — il n'a rien à saisir d'autre que ce mot de
              passe.
            </div>
          </div>

          <button className="btn-primary btn-full btn-large" onClick={onBackHome}>
            Retour à l'accueil
          </button>
        </div>
      </section>
    </div>
  );
}

export default GiftConfirmedPage;
