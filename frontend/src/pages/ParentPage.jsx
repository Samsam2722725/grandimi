import { useState, useEffect } from 'react';
import { Check, CreditCard, ShieldCheck, Wallet } from 'lucide-react';

import Spinner from '../components/Spinner';
import apiClient from '../lib/api';
import { OFFRES, euros } from '../lib/offres';
import '../styles/funnel.css';
import '../styles/paywall-night.css';
import { capture, checkoutOuvert, parentPageVue } from '../lib/analytics';

/* Page ouverte par un parent depuis le lien envoyé par son enfant
   (grandimi.com/?parent=<id du compte enfant>&offre=…&fin=…).

   Le parent paie avec SON e-mail — c'est lui le client Whop — mais
   l'abonnement atterrit sur le compte de l'enfant : childUserId est noté
   dans localStorage avant le départ vers Whop, puis réclamé au retour
   avec l'identifiant du paiement (le webhook ne reçoit pas les
   métadonnées d'URL de Whop).

   L'e-mail et les réponses de l'enfant ne sont jamais affichés : la page
   est ouverte à qui possède le lien.

   MÊMES ARGUMENTS QUE LE PAYWALL, VUS PAR LE PARENT
   Même habillage (pw3), mêmes offres, même réduction tant qu'elle court
   chez l'enfant, même « ce que contient le plan ». En plus, ce qu'un
   parent se demande avant de sortir sa carte : est-ce sans danger, est-ce
   sérieux, puis-je arrêter, et comment mon enfant y accède. */

const CONTENU_PLAN = [
  ['Paraître plus grand dès les premières semaines', 'Gainage, épaules ouvertes, dos aligné : sa posture redressée.'],
  ['Dormir pour grandir', 'Coucher avancé de 15 min par semaine, écrans coupés 45 min avant de dormir.'],
  ['Décompresser sa colonne', 'Suspension à la barre et étirements, 10 min par jour.'],
  ['Manger pour grandir', 'Protéines à chaque repas, calcium et vitamine D, par l’alimentation.'],
  ['Son plan, jour par jour', 'On corrige d’abord ce qui le freine. Un nouveau thème chaque mois.'],
  ['Son guide pour grandir', 'Ce qui marche vraiment, les mythes à oublier.'],
  ['Sa taille adulte estimée', '98 % de précision. Avec les offres 3 mois et À vie.'],
];

const RASSURANCES = [
  ['100 % naturel', 'Sommeil, alimentation, exercices. Aucun médicament, aucun complément à acheter.'],
  ['De bonnes habitudes, quoi qu’il arrive', 'Moins d’écran le soir, plus de sport, mieux manger : utile bien au-delà de la taille.'],
  ['Sans engagement', 'Résiliable en ligne à tout moment, sans justification ni appel.'],
  ['Paiement sécurisé', 'Encaissé par Whop. Grandimi ne voit ni ne stocke votre carte.'],
];

const FAQ_PARENT = [
  ['Est-ce sans danger ?', 'Oui. Le plan ne repose que sur le sommeil, l’alimentation, la posture et des exercices simples de quelques minutes. Aucun médicament, aucun complément : un complément ne se prend que sur avis médical, en cas de manque.'],
  ['Est-ce que ça marche vraiment ?', 'Le plan agit sur ce qui dépend de lui : un sommeil suffisant, une alimentation qui apporte ce qu’il faut aux os, une posture droite. Sa posture se voit dès les premières semaines ; sa croissance, il la suit en se mesurant chaque semaine.'],
  ['Dois-je créer un compte ?', 'Non. Vous recevez seulement un reçu par e-mail. L’accès s’ouvre sur le compte de votre enfant.'],
  ['Comment mon enfant y accède-t-il ?', 'Sur le téléphone où il a fait son analyse, son plan s’ouvre tout seul : il choisit juste un mot de passe. Sur un autre appareil : grandimi.com → « Se connecter » → « Choisir mon mot de passe », avec l’e-mail de son analyse.'],
  ['Puis-je arrêter quand je veux ?', 'Oui, en ligne et sans justification. L’accès reste ouvert jusqu’à la fin de la période déjà payée. L’offre À vie se paie une seule fois.'],
  ['Est-ce un dispositif médical ?', 'Non. Grandimi ne pose aucun diagnostic et ne remplace pas l’avis d’un médecin. En cas d’inquiétude sur la croissance de votre enfant, parlez-en à son pédiatre.'],
];

/* Au-delà de ce délai, on nomme l'attente au lieu de la laisser tourner. */
const DELAI_AVANT_MESSAGE_MS = 4000;

function ParentPage({ childUserId }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [attenteLongue, setAttenteLongue] = useState(false);
  const [erreur, setErreur] = useState(null);
  // L'offre que l'enfant avait choisie (&offre= dans le lien).
  const parametres = new URLSearchParams(window.location.search);
  const [planChoisi, setPlanChoisi] = useState(() => {
    const offre = parametres.get('offre');
    return OFFRES.some((o) => o.duree === offre) ? offre : 'm3';
  });
  // La réduction de l'enfant court encore : le parent paie le même prix.
  const finReductionEnfant = Number(parametres.get('fin')) || 0;
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const resteMs = Math.max(0, finReductionEnfant - maintenant);
  const reductionActive = resteMs > 0;
  const minuteur = `${String(Math.floor(resteMs / 60000)).padStart(2, '0')}:${String(Math.floor((resteMs % 60000) / 1000)).padStart(2, '0')}`;
  const cleWhop = reductionActive ? planChoisi : `${planChoisi}_normal`;

  useEffect(() => {
    parentPageVue();
  }, []);

  /* Réveille l'instance Render pendant que le parent lit : sur l'offre
     gratuite le réveil prend jusqu'à une minute, sinon c'est le clic sur
     « Payer » qui paierait l'attente. */
  useEffect(() => {
    apiClient.getPlans().catch(() => {});
  }, []);

  const offre = OFFRES.find((o) => o.duree === planChoisi) || OFFRES[1];
  const prixOffre = (o) => (reductionActive ? o.reduit : o.normal);
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const lancerPaiement = async () => {
    if (!emailValide) {
      setErreur('Entrez votre adresse e-mail pour recevoir le reçu.');
      document.getElementById('parent-email')?.focus();
      return;
    }
    setErreur(null);
    setLoading(true);
    setAttenteLongue(false);
    const minuterie = setTimeout(() => setAttenteLongue(true), DELAI_AVANT_MESSAGE_MS);

    try {
      const { checkout_url: checkoutURL } = await apiClient.createCheckout({
        email: email.trim(),
        childUserId,
        plan: cleWhop,
      });
      if (!checkoutURL) throw new Error("Le serveur n'a pas renvoyé d'adresse de paiement.");

      /* Pour qui est ce paiement : réclamé au retour de Whop avec
         l'identifiant du paiement (voir App.jsx). */
      try {
        localStorage.setItem('grandimi:paiement_pour', childUserId);
      } catch {
        /* navigation privée : le rattachement se fera à la main */
      }

      checkoutOuvert(planChoisi);
      window.location.href = checkoutURL;
    } catch (err) {
      setErreur(err.message || "Impossible d'ouvrir la page de paiement. Réessayez dans un instant.");
      setLoading(false);
      setAttenteLongue(false);
    } finally {
      clearTimeout(minuterie);
    }
  };

  const blocOffres = (
    <section className="pw3-offres" role="radiogroup" aria-label="Choisir la formule">
      {OFFRES.map((o) => {
        const choisie = planChoisi === o.duree;
        return (
          <button
            key={o.duree}
            type="button"
            role="radio"
            aria-checked={choisie}
            className={`pw3-offre ${choisie ? 'is-choisie' : ''}`}
            onClick={() => {
              setPlanChoisi(o.duree);
              capture('parent_plan_choisi', { etape: o.duree });
            }}
          >
            {o.populaire && <span className="pw3-offre-bandeau">Le plus choisi</span>}
            <span className="pw3-offre-coche" aria-hidden="true">{choisie && <Check size={14} strokeWidth={3} />}</span>
            <span className="pw3-offre-gauche">
              <span className="pw3-offre-nom">
                {o.nom}
                {reductionActive && <span className="pw3-offre-remise">-{Math.round((1 - o.reduit / o.normal) * 100)} %</span>}
              </span>
              <span className="pw3-offre-total">
                {reductionActive && <s>{euros(o.normal)}</s>} {euros(prixOffre(o))} {o.facture}
              </span>
              {o.jours && <span className="pw3-offre-renouv">Se renouvelle automatiquement</span>}
            </span>
            <span className="pw3-offre-droite">
              <span className="pw3-offre-jour">{o.jours ? euros(prixOffre(o) / o.jours) : euros(prixOffre(o))}</span>
              <span className="pw3-offre-par">{o.jours ? '/ jour' : 'pour toujours'}</span>
            </span>
          </button>
        );
      })}
    </section>
  );

  const blocAction = (
    <div className="pw3-action">
      <button type="button" className="funnel-cta" onClick={lancerPaiement} disabled={loading}>
        {loading ? (
          <>
            <Spinner />
            Ouverture du paiement…
          </>
        ) : (
          `Payer pour mon enfant — ${euros(prixOffre(offre))}`
        )}
      </button>
      <p className="pw2-facture">
        {`Facturé ${euros(prixOffre(offre))} ${offre.facture}`} · <a href="/cgv.html">Conditions</a> · Résiliable à tout moment
      </p>
      {attenteLongue && (
        <p className="parent-attente" role="status">
          On ouvre la page de paiement sécurisée. Cela peut prendre quelques secondes, ne fermez pas la page.
        </p>
      )}
    </div>
  );

  return (
    <div className="night paywall">
      <header className="pw2-top">
        <span className="pw2-logo">Grandimi</span>
      </header>

      <main className="paywall-scroll pw2 pw3">
        {reductionActive && (
          <div className="pw3-minuteur" role="timer">
            ⚡ Le prix réduit de votre enfant est réservé encore <strong>{minuteur}</strong>
          </div>
        )}

        <p className="pw3-pret">Son plan est prêt ✓</p>
        <h1 className="pw3-titre">
          Aidez votre enfant à atteindre <span>sa taille maximale</span>
        </h1>
        <p className="pw3-sous-titre">
          Il a fait son analyse sur Grandimi. Son plan pour grandir est prêt : il ne manque que vous.
        </p>

        {/* L'e-mail d'abord : c'est la seule chose à remplir, et le bouton
            reste toujours cliquable (il explique ce qui manque). */}
        <section className="parent-champ-bloc pw3-parent-email">
          <label className="parent-label" htmlFor="parent-email">
            Votre e-mail (pour le reçu)
          </label>
          <input
            id="parent-email"
            className="parent-champ"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="vous@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </section>

        <h2 className="pw3-choisis">Choisissez sa formule.</h2>
        {blocOffres}
        {erreur && (
          <p className="funnel-error" role="alert">
            {erreur}
          </p>
        )}
        {blocAction}

        <div className="paywall-paiement">
          <p className="paywall-paiement-titre">
            <ShieldCheck size={17} aria-hidden="true" />
            Paiement sécurisé, encaissé par Whop
          </p>
          <ul className="paywall-paiement-moyens">
            <li><span className="paywall-paiement-whop" aria-hidden="true">W\</span>Whop</li>
            <li><CreditCard size={16} aria-hidden="true" />Carte bancaire</li>
            <li><Wallet size={16} aria-hidden="true" />Apple Pay</li>
          </ul>
        </div>

        <section className="pw3-obtiens">
          <h2>Son plan contient — fait pour lui</h2>
          <ul>
            {CONTENU_PLAN.map(([titre, texte]) => (
              <li key={titre}>
                <span className="pw3-obtiens-coche" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span>
                  <strong>{titre}</strong>
                  <span className="pw3-obtiens-texte">{texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pw3-obtiens">
          <h2>Pourquoi vous pouvez dire oui</h2>
          <ul>
            {RASSURANCES.map(([titre, texte]) => (
              <li key={titre}>
                <span className="pw3-obtiens-coche" aria-hidden="true">
                  <ShieldCheck size={14} strokeWidth={2.5} />
                </span>
                <span>
                  <strong>{titre}</strong>
                  <span className="pw3-obtiens-texte">{texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pw3-obtiens">
          <h2>Après votre paiement</h2>
          <ul>
            {[
              ['Aucun compte à créer', 'Vous recevez seulement un reçu par e-mail.'],
              ['Son plan s’ouvre sur son téléphone', 'Il choisit un mot de passe, et c’est parti.'],
              ['Vous gardez la main', 'Vous pouvez résilier en ligne quand vous voulez.'],
            ].map(([titre, texte]) => (
              <li key={titre}>
                <span className="pw3-obtiens-coche" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span>
                  <strong>{titre}</strong>
                  <span className="pw3-obtiens-texte">{texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pw3-faq">
          <h2>Les questions des parents</h2>
          {FAQ_PARENT.map(([q, r]) => (
            <details key={q} className="pw3-faq-item">
              <summary>{q}</summary>
              <p>{r}</p>
            </details>
          ))}
        </section>

        <h2 className="pw3-choisis">Prêt à l’aider ?</h2>
        {blocOffres}
        {blocAction}
      </main>
    </div>
  );
}

export default ParentPage;
