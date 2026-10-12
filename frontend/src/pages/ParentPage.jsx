import { useState, useEffect } from 'react';
import { Check, Lock } from 'lucide-react';

import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import { OFFRES, euros } from '../lib/offres';
import '../styles/funnel.css';
import '../styles/paywall-night.css';
import { checkoutOuvert, parentPageVue } from '../lib/analytics';

/* Page ouverte par un parent depuis le lien partagé par son enfant
   (grandimi.com/?parent=<id du compte enfant>).

   Le parent paie avec SON email — c'est lui le client Whop — mais
   l'abonnement doit atterrir sur le compte de l'enfant. C'est
   `childUserId` qui porte cette information jusqu'au webhook.

   L'email de l'enfant n'est volontairement pas affiché : la page est
   accessible à qui possède le lien, l'y exposer permettrait de lire
   l'adresse d'un mineur à partir d'un simple identifiant.

   MÊME HABILLAGE QUE LA PAYWALL DE L'ENFANT
   Cette page tournait seule sur l'ancienne feuille paywall.css pendant
   que la paywall enfant passait au thème sombre : le parent arrivait
   sur un écran visiblement plus pauvre que le reste du site, à
   l'instant précis où on lui demande sa carte. Elle reprend maintenant
   funnel.css + paywall-night.css et les mêmes classes, pour que les
   deux écrans de paiement soient le même produit.

   CE QUI SE PASSE APRÈS EST EXPLIQUÉ AVANT
   Le parent est le seul visiteur du site qui paie sans avoir rien
   essayé. La marche à suivre pour son enfant ne figurait que sur
   l'écran de confirmation, donc APRÈS la carte : il payait sans savoir
   comment son enfant récupérerait l'accès. Elle est désormais lisible
   avant, au-dessus du prix. */

const AVANTAGES = [
  'Ce qui freine sa croissance, et comment le corriger',
  'Son plan personnalisé : exercices, posture, sommeil, alimentation',
  'Son suivi : il se mesure chaque semaine',
  'Résiliable en ligne à tout moment',
];

/* Mêmes deux offres que la paywall enfant, mêmes valeurs par défaut :
   getPlans() ne fait que les confirmer, le montant réel restant décidé
   par le plan Whop choisi côté serveur. */
/* Les trois offres du paywall (lib/offres.js). Le lien envoyé au parent
   porte l'offre choisie et la fin de la réduction de l'enfant : tant
   qu'elle court, le parent paie le même prix réduit ; après, le prix
   normal s'applique, comme sur le paywall. */

/* Au-delà de ce délai, on nomme l'attente au lieu de la laisser tourner. */
const DELAI_AVANT_MESSAGE_MS = 4000;

function ParentPage({ childUserId }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [attenteLongue, setAttenteLongue] = useState(false);
  const [erreur, setErreur] = useState(null);
  // L'offre que l'enfant avait choisie (&offre= dans le lien) : le parent
  // tombait sur le mensuel alors que l'enfant lui demandait l'annuel.
  const parametres = new URLSearchParams(window.location.search);
  const [planChoisi, setPlanChoisi] = useState(() => {
    const offre = parametres.get('offre');
    return OFFRES.some((o) => o.duree === offre) ? offre : 'm3';
  });
  const finReductionEnfant = Number(parametres.get('fin')) || 0;
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const reductionActive = finReductionEnfant > maintenant;
  const cleWhop = reductionActive ? planChoisi : `${planChoisi}_normal`;

  /* Le chemin parent est passé en action de premier rang sur la
     paywall sans avoir jamais été mesuré : on ignore s'il est
     emprunté, et à plus forte raison s'il aboutit. */
  useEffect(() => {
    parentPageVue();
  }, []);

  /* Cet appel confirme les tarifs — et, effet de bord utile, il réveille
     l'instance Render pendant que le parent lit la page. Sur l'offre
     gratuite elle s'endort après un quart d'heure sans trafic et le
     réveil prend jusqu'à une minute : sans ce coup de semonce, c'est le
     clic sur « Régler » qui paierait l'attente. */
  useEffect(() => {
    let annule = false;
    apiClient
      .getPlans()
      .then(() => {})
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  const offre = OFFRES.find((o) => o.duree === planChoisi) || OFFRES[1];
  const prixOffre = reductionActive ? offre.reduit : offre.normal;
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);


  const lancerPaiement = async () => {
    setErreur(null);
    setLoading(true);
    setAttenteLongue(false);

    /* Un bouton qui tourne sans rien dire se lit comme un bouton cassé —
       c'est le retour qu'on a eu du parcours parent. Passé quatre
       secondes, on explique au lieu de faire attendre en silence. */
    const minuterie = setTimeout(() => setAttenteLongue(true), DELAI_AVANT_MESSAGE_MS);

    try {
      const { checkout_url: checkoutURL } = await apiClient.createCheckout({
        email,
        childUserId,
        plan: cleWhop,
      });

      if (!checkoutURL) {
        throw new Error("Le serveur n'a pas renvoyé d'URL de paiement.");
      }

      /* On note POUR QUI ce paiement est fait, avant de quitter le site.

         Le parent paie depuis son propre appareil : son navigateur ne
         connaît aucun compte Grandimi, il n'a jamais fait le
         questionnaire. Au retour de Whop, sans cette note, il n'y a
         rien à créditer et l'enfant n'obtient rien.

         Ce chemin passait jusqu'ici par metadata[child_user_id] dans
         l'URL de paiement. Whop ne transmet pas ces métadonnées — le
         webhook les reçoit vides, vérifié sur trois paiements réels —
         donc le parcours parent n'a jamais pu fonctionner. On utilise
         désormais le même mécanisme que le paiement normal :
         l'identifiant de paiement, réclamé au retour pour ce compte. */
      try {
        localStorage.setItem('grandimi:paiement_pour', childUserId);
      } catch {
        /* navigation privée ou quota plein : le paiement se fait quand
           même, mais le rattachement devra être fait à la main. */
      }

      checkoutOuvert(planChoisi);
      window.location.href = checkoutURL;
    } catch (err) {
      setErreur(
        err.message || "Impossible d'ouvrir la page de paiement. Réessayez dans un instant.",
      );
      setLoading(false);
      setAttenteLongue(false);
    } finally {
      clearTimeout(minuterie);
    }
  };

  return (
    <div className="night paywall">
      <main className="paywall-scroll">
        <h1 className="paywall-title">Votre enfant vous demande de régler son plan</h1>
        <p className="paywall-subtitle">
          Vous payez depuis votre propre adresse e-mail. L’accès, lui, s’ouvre sur le
          compte que votre enfant a déjà créé en faisant son estimation.
        </p>

        <section className="paywall-pillars" aria-label="Ce que vous payez">
          <h2 className="paywall-section-title">Ce que vous payez</h2>
          {/* Cette page annonçait « cette partie est et reste gratuite » à
              propos de l'estimation. Ce n'est plus vrai : la taille adulte
              est passée sous cadenas, et c'est l'abonnement qui l'ouvre.
              Laisser la phrase, c'était promettre au payeur un produit qui
              n'existe plus sous cette forme. */}
          <p className="parent-texte">
            Votre enfant a répondu à un questionnaire — âge, taille, poids, la vôtre et
            celle de l’autre parent, puis son sommeil, son alimentation et son activité.
            Son analyse est prête : on sait ce qui freine sa croissance.
          </p>
          <p className="parent-texte">
            L’abonnement lui ouvre <strong>son programme pour grandir</strong> : chaque jour,
            quoi faire pour son sommeil, son alimentation, sa posture et ses exercices,
            construit à partir de ses réponses.
          </p>

          <ul className="paywall-features">
            {AVANTAGES.map((avantage) => (
              <li key={avantage}>
                <Check size={18} aria-hidden="true" />
                <span>{avantage}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Avant le prix, volontairement : c’est la question que le parent se
            pose en tenant sa carte — « et ensuite, comment mon enfant y
            accède ? ». La lui laisser sans réponse jusqu’à l’écran de
            confirmation, c’est la lui faire poser au mauvais moment. */}
        <section className="parent-suite" aria-labelledby="parent-suite-titre">
          <h2 className="paywall-section-title" id="parent-suite-titre">
            Ce qui se passe après votre paiement
          </h2>

          <p className="parent-texte">
            <strong>Vous n’avez aucun compte à créer</strong>, et rien à installer.
            L’accès s’ouvre sur le compte de votre enfant, pas sur le vôtre.
          </p>
          <p className="parent-texte">
            Sur le téléphone où il a fait son estimation,{' '}
            <strong>son plan s’ouvre tout seul</strong> : il lui sera simplement demandé
            de choisir un mot de passe.
          </p>
          <p className="parent-texte">
            S’il est sur un autre téléphone ou un autre navigateur, son estimation n’est
            pas en mémoire. <strong>En trois étapes :</strong>
          </p>

          <ol className="parent-etapes">
            <li>Aller sur grandimi.com et cliquer sur « Se connecter »</li>
            <li>Choisir « Choisir mon mot de passe »</li>
            <li>
              Saisir <strong>exactement la même adresse e-mail</strong> que celle utilisée
              pour son estimation, puis choisir un mot de passe
            </li>
          </ol>

          <p className="parent-texte">
            Son plan l’attend derrière. Cela ne crée pas de second compte : c’est bien le
            sien qui s’ouvre, avec l’abonnement que vous venez de régler.
          </p>
          <p className="parent-texte parent-texte--discret">
            Si l’adresse ne correspond pas, l’accès reste attaché au compte de son
            estimation. Demandez-lui laquelle il a saisie — une faute de frappe suffit à
            créer une autre adresse.
          </p>
        </section>

        <section className="paywall-offer" aria-labelledby="parent-offre-titre">
          <div className="paywall-plan-toggle" role="radiogroup" aria-label="Choisir la formule">
            {OFFRES.map((o) => (
              <button
                key={o.duree}
                type="button"
                role="radio"
                aria-checked={planChoisi === o.duree}
                className={`paywall-plan-option ${planChoisi === o.duree ? 'active' : ''}`}
                onClick={() => setPlanChoisi(o.duree)}
              >
                {o.nom}
              </button>
            ))}
          </div>

          <div className="paywall-offer-head">
            <h2 id="parent-offre-titre">Plan pour grandir · {offre.nom}</h2>
            <p className="paywall-price">
              {reductionActive && <s style={{ opacity: 0.5, marginRight: 8, fontSize: '0.6em' }}>{euros(offre.normal)}</s>}
              <span>{euros(prixOffre)}</span> {offre.facture}
            </p>
            <p className="paywall-savings">{offre.avantages.join(' · ')}</p>
          </div>
        </section>

        <section className="parent-champ-bloc">
          <label className="parent-label" htmlFor="parent-email">
            Votre e-mail
          </label>
          <input
            id="parent-email"
            className="parent-champ"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="vous@email.com"
            value={email}
            onChange={(evenement) => setEmail(evenement.target.value)}
          />
          <p className="parent-texte parent-texte--discret">
            Sert à votre reçu et à gérer ou résilier l’abonnement. C’est bien le compte de
            votre enfant qui recevra l’accès.
          </p>
        </section>

        {erreur && (
          <p className="funnel-error" role="alert">
            {erreur}
          </p>
        )}

        <p className="paywall-security">
          <Lock size={15} aria-hidden="true" />
          Paiement traité par Whop. Grandimi ne voit ni ne stocke votre carte bancaire.
        </p>

        <section className="paywall-faq">
          <details>
            <summary>Dois-je créer un compte ?</summary>
            <p>
              Non. Aucun compte n’est créé à votre nom. Vous recevez un reçu par e-mail,
              et c’est tout.
            </p>
          </details>
          <details>
            <summary>Comment mon enfant y accède-t-il ensuite ?</summary>
            <p>
              Il retourne sur grandimi.com et choisit un mot de passe. Sur un autre
              appareil, il clique « Se connecter » puis « Choisir mon mot de passe », avec la même
              adresse e-mail qu’à son estimation.
            </p>
          </details>
          <details>
            <summary>Puis-je résilier ?</summary>
            <p>
              Oui, en ligne et à tout moment, sans justification et sans appel à passer.
              L’accès reste actif jusqu’à la fin de la période déjà payée.
            </p>
          </details>
          <details>
            <summary>Est-ce un dispositif médical ?</summary>
            <p>
              Non. Grandimi ne pose aucun diagnostic et ne remplace pas l’avis d’un
              professionnel de santé. L’estimation repose sur des modèles statistiques et
              sur les réponses saisies.
            </p>
          </details>
        </section>

        <p className="paywall-legal">
          En continuant, vous acceptez nos <a href="/cgv.html">conditions d’utilisation</a>{' '}
          et notre <a href="/privacy.html">politique de confidentialité</a>. Résiliable en
          ligne à tout moment.
        </p>
      </main>

      <footer className="funnel-footer">
        <button
          type="button"
          className="funnel-cta"
          onClick={lancerPaiement}
          disabled={!emailValide || loading}
        >
          {loading ? (
            <>
              <Spinner />
              Ouverture du paiement…
            </>
          ) : (
            `Régler l’abonnement — ${euros(prixOffre)} ${offre.facture}`
          )}
        </button>

        {attenteLongue && (
          <p className="parent-attente" role="status">
            Le serveur se réveille — cela peut prendre jusqu’à une minute la première
            fois. Ne fermez pas la page.
          </p>
        )}
      </footer>
    </div>
  );
}

export default ParentPage;
