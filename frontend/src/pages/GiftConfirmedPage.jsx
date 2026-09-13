import '../styles/paywall.css';

/* Écran affiché à un parent qui revient de Whop après avoir payé depuis
   le lien partagé par son enfant. Aucun compte n'est créé ici : l'accès a
   déjà été appliqué au compte de l'enfant par le webhook, avant même que
   cette page ne s'affiche.

   Sans cet écran, le parent atterrissait sur "Créez votre mot de passe"
   avec sa propre adresse — ce qui lui créait un compte inutile, jamais
   premium, pendant que l'enfant ne recevait aucune invite à se
   connecter.

   POURQUOI UN MODE D'EMPLOI NUMÉROTÉ, ET PAS DEUX PHRASES
   La version précédente disait seulement « qu'il retourne sur
   grandimi.com, l'écran pour créer son mot de passe apparaîtra
   automatiquement ». C'est vrai sur le téléphone où il a répondu au
   questionnaire — et faux partout ailleurs : cette détection lit
   l'identifiant du compte dans la mémoire du navigateur, qui est vide
   sur un autre appareil. Le parent repartait donc avec une instruction
   qui marche une fois sur deux, pour un produit qu'il vient de payer.

   Le rattrapage existe déjà côté serveur : « Créer un compte » avec une
   adresse qui a déjà une estimation ne crée pas de doublon, il pose
   simplement le mot de passe manquant et ouvre l'accès (cf. Signup dans
   internal/api/handlers.go — un compte DÉJÀ protégé par un mot de passe,
   lui, est refusé). Restait à l'écrire quelque part. */
function GiftConfirmedPage({ onBackHome }) {
  return (
    <div className="paywall-page">
      <section className="payment-section">
        <div className="payment-box">
          <h1 style={{ textAlign: 'center' }}>Paiement confirmé 🎉</h1>

          <p style={{ textAlign: 'center' }}>
            L'abonnement est activé sur le compte de votre enfant — pas sur celui-ci.
            Vous avez payé depuis le lien qu'il vous a envoyé, donc l'accès s'ouvre
            directement chez lui.
          </p>
          <p style={{ textAlign: 'center' }}>
            <strong>Vous n'avez aucun compte à créer</strong>, et rien d'autre à faire.
          </p>

          <div className="alert alert-info" style={{ margin: '28px 0', textAlign: 'left' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: 10 }}>
                Ce que votre enfant doit faire
              </strong>

              <p style={{ margin: '0 0 12px' }}>
                <strong>Sur le téléphone où il a fait son estimation :</strong> il retourne
                sur grandimi.com, et son plan s'ouvre tout seul. Il lui sera simplement
                demandé de choisir un mot de passe.
              </p>

              <p style={{ margin: '0 0 8px' }}>
                <strong>Sur un autre téléphone ou un autre navigateur</strong>, son
                estimation n'est pas en mémoire. En trois étapes :
              </p>

              <ol style={{ margin: '0 0 12px', paddingLeft: 22, lineHeight: 1.65 }}>
                <li>Aller sur grandimi.com et cliquer sur <strong>« Se connecter »</strong></li>
                <li>Choisir <strong>« Créer un compte »</strong></li>
                <li>
                  Saisir <strong>exactement la même adresse e-mail</strong> que celle
                  utilisée pour son estimation, puis choisir un mot de passe
                </li>
              </ol>

              <p style={{ margin: 0 }}>
                Son plan l'attend derrière. Cela ne crée pas de second compte : c'est bien
                le sien qui s'ouvre, avec l'abonnement que vous venez de régler.
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', opacity: 0.75, textAlign: 'left', margin: '0 0 10px' }}>
            <strong>Si l'adresse ne correspond pas :</strong> l'accès reste attaché au
            compte de son estimation. Demandez-lui laquelle il a saisie — une faute de
            frappe suffit à créer une autre adresse.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.75, textAlign: 'left', margin: '0 0 24px' }}>
            Un reçu vous a été envoyé par Whop, qui traite le paiement. L'abonnement est
            résiliable en ligne à tout moment, et Grandimi ne conserve aucune donnée de
            votre carte.
          </p>

          <button className="btn-primary btn-full btn-large" onClick={onBackHome}>
            Retour à l'accueil
          </button>
        </div>
      </section>
    </div>
  );
}

export default GiftConfirmedPage;
