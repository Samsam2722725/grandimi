import { Check } from 'lucide-react';

import '../styles/funnel.css';
import '../styles/paywall-night.css';

/* Écran affiché à un parent qui revient de Whop après avoir payé depuis
   le lien partagé par son enfant. Aucun compte n'est créé ici : l'accès a
   déjà été appliqué au compte de l'enfant par le webhook, avant même que
   cette page ne s'affiche.

   Sans cet écran, le parent atterrissait sur "Créez votre mot de passe"
   avec sa propre adresse — ce qui lui créait un compte inutile, jamais
   premium, pendant que l'enfant ne recevait aucune invite à se
   connecter.

   MÊME HABILLAGE QUE LA PAGE DE PAIEMENT
   Le parent vient de passer par ParentPage, en thème sombre. Revenir sur
   l'ancienne feuille claire donnait l'impression d'avoir atterri sur un
   autre site — au moment précis où il attend la confirmation d'un
   paiement qu'il vient de faire.

   POURQUOI UN MODE D'EMPLOI NUMÉROTÉ, ET PAS DEUX PHRASES
   La version précédente disait seulement « qu'il retourne sur
   grandimi.com, l'écran pour créer son mot de passe apparaîtra
   automatiquement ». C'est vrai sur le téléphone où il a répondu au
   questionnaire — et faux partout ailleurs : cette détection lit
   l'identifiant du compte dans la mémoire du navigateur, vide sur un
   autre appareil. Le parent repartait avec une instruction qui marche
   une fois sur deux, pour un produit qu'il vient de payer.

   Le rattrapage existe déjà côté serveur : « Créer un compte » avec une
   adresse qui a déjà une estimation ne crée pas de doublon, il pose
   simplement le mot de passe manquant et ouvre l'accès (cf. Signup dans
   internal/api/handlers.go — un compte DÉJÀ protégé par un mot de passe,
   lui, est refusé). Restait à l'écrire quelque part. */
function GiftConfirmedPage({ onBackHome }) {
  return (
    <div className="night paywall">
      <main className="paywall-scroll">
        <p className="gift-badge">
          <Check size={18} aria-hidden="true" />
          Paiement confirmé
        </p>

        <h1 className="paywall-title">C’est réglé, merci.</h1>
        <p className="paywall-subtitle">
          L’abonnement est activé sur le compte de votre enfant — pas sur celui-ci. Vous
          avez payé depuis le lien qu’il vous a envoyé, donc l’accès s’ouvre directement
          chez lui.
        </p>

        <section className="parent-suite" aria-labelledby="gift-suite-titre">
          <h2 className="paywall-section-title" id="gift-suite-titre">
            Ce que votre enfant doit faire
          </h2>

          <p className="parent-texte">
            <strong>Vous n’avez aucun compte à créer</strong>, et rien d’autre à faire de
            votre côté.
          </p>
          <p className="parent-texte">
            Sur le téléphone où il a fait son estimation, il retourne sur grandimi.com et{' '}
            <strong>son plan s’ouvre tout seul</strong> : il lui sera simplement demandé
            de choisir un mot de passe.
          </p>
          <p className="parent-texte">
            S’il est sur un autre téléphone ou un autre navigateur, son estimation n’est
            pas en mémoire. <strong>En trois étapes :</strong>
          </p>

          <ol className="parent-etapes">
            <li>Aller sur grandimi.com et cliquer sur « Se connecter »</li>
            <li>Choisir « Créer un compte »</li>
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

        <p className="parent-texte parent-texte--discret">
          Un reçu vous a été envoyé par Whop, qui traite le paiement. L’abonnement est
          résiliable en ligne à tout moment, sans justification, et Grandimi ne conserve
          aucune donnée de votre carte.
        </p>
      </main>

      <footer className="funnel-footer">
        <button type="button" className="funnel-cta" onClick={onBackHome}>
          Retour à l’accueil
        </button>
      </footer>
    </div>
  );
}

export default GiftConfirmedPage;
