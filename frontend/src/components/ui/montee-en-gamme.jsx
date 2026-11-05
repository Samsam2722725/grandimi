import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

import apiClient from '@/lib/api';
import { OFFRES, euros, nomOffre, offresAuDessus } from '@/lib/offres';
import { capture } from '@/lib/analytics';
import '@/styles/montee-en-gamme.css';

/* Changer d'offre depuis l'app (« Mon compte » et « Ma taille ») : 1 mois
   vers 3 mois ou À vie, 3 mois vers À vie. On ne redescend jamais.

   Règle (12/10/2026) : il paie la nouvelle offre maintenant, l'ancienne
   s'arrête tout de suite chez Whop (internal/api/montee_en_gamme.go), et
   les jours restants ne sont pas remboursés. On le lui dit AVANT qu'il
   paie, en clair. Prix : le tarif réduit du paywall.

   Le paiement se fait dans le panneau, avec Whop Elements comme sur le
   paywall : il revient avec le payment_id, qui rattache le paiement au
   bon compte même si l'e-mail Whop est différent. */
export function MonteeEnGamme({ planKey, resilie = false, titre = 'Change d’offre', predictionData, onFermer }) {
  const possibles = offresAuDessus(planKey);
  const [choix, setChoix] = useState(possibles[0]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [planWhop, setPlanWhop] = useState(null);
  const [formulairePret, setFormulairePret] = useState(false);
  const blocWhop = useRef(null);
  const offre = OFFRES.find((o) => o.duree === choix);
  // L'e-mail du compte d'abord : c'est sur lui que le serveur vérifie l'offre
  // active. Les deux autres peuvent venir d'une autre analyse sur ce téléphone.
  const email = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').email || '';
    } catch {
      return '';
    }
  })() || predictionData?.email || localStorage.getItem('userEmail') || '';

  const payer = async () => {
    setErreur(null);
    setChargement(true);
    try {
      const utilisateur = JSON.parse(localStorage.getItem('user') || '{}');
      capture('montee_en_gamme', { etape: choix });
      const { checkout_url: url } = await apiClient.createCheckout({ email, userId: utilisateur.id, plan: choix });
      const plan = (url || '').match(/checkout\/(plan_[A-Za-z0-9]+)/)?.[1];
      if (!plan) throw new Error('');
      setPlanWhop(plan);
    } catch (e) {
      setErreur(e.status === 409 ? 'Tu as déjà cette offre ou une offre supérieure.' : 'Impossible d’ouvrir le paiement. Réessaie dans un instant.');
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (!planWhop) return undefined;
    let annule = false;
    let minuteur;
    let paiement;

    const echec = () => {
      setErreur('Impossible d’ouvrir le paiement. Réessaie dans un instant.');
      setPlanWhop(null);
      setFormulairePret(false);
    };

    const monter = () => {
      if (annule || !blocWhop.current || !window.WhopElements) return;
      try {
        paiement = window.WhopElements({ locale: 'fr', appearance: { theme: { appearance: 'dark' } } }).checkout.create({
          plan: planWhop,
          returnUrl: `${window.location.origin}/`,
          onComplete: (resultat) => {
            const id = resultat?.paymentId || resultat?.receipt_id || '';
            capture('whop_paiement_termine', { etape: id ? 'avec_id' : 'sans_id' });
            window.location.href = id ? `/?payment_id=${encodeURIComponent(id)}&status=success` : '/?status=success';
          },
        });
        paiement.create('checkout', { buyerEmail: email }).mount(blocWhop.current);
        minuteur = setInterval(() => {
          if (typeof paiement.isLoading !== 'function' || !paiement.isLoading()) {
            clearInterval(minuteur);
            setFormulairePret(true);
          }
        }, 200);
      } catch (e) {
        capture('whop_erreur_paiement', { etape: String(e?.message || 'montage').slice(0, 80) });
        echec();
      }
    };

    let script = document.querySelector('script[src*="elements.js"]');
    if (window.WhopElements) {
      monter();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://cdn.whop.com/elements/amber/elements.js';
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', monter);
      script.addEventListener('error', echec);
    }
    // Comme sur le paywall : l'attente s'efface au bout de 12 s, quoi qu'il arrive.
    const limite = setTimeout(() => setFormulairePret(true), 12000);
    return () => {
      annule = true;
      clearInterval(minuteur);
      clearTimeout(limite);
      script?.removeEventListener('load', monter);
      script?.removeEventListener('error', echec);
      try {
        paiement?.destroy();
      } catch {
        // Whop a déjà retiré son formulaire.
      }
    };
  }, [planWhop, email]);

  if (!offre) return null;
  return (
    <div className="montee" role="dialog" aria-label={titre} onClick={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="montee-panneau">
        <div className="montee-haut">
          <h2>{planWhop ? `${offre.nom} · ${euros(offre.reduit)}` : titre}</h2>
          <button type="button" className="montee-fermer" onClick={onFermer} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {planWhop ? (
          <>
            {!formulairePret && <p className="montee-attente" role="status">Le paiement se charge…</p>}
            <div ref={blocWhop} className="montee-whop" />
          </>
        ) : (
          <>
            <div className={`montee-offres ${possibles.length === 1 ? 'montee-offres--seule' : ''}`} role="radiogroup">
              {possibles.map((cle) => {
                const o = OFFRES.find((x) => x.duree === cle);
                const actif = choix === cle;
                return (
                  <button key={cle} type="button" role="radio" aria-checked={actif} className={`montee-offre ${actif ? 'active' : ''}`} onClick={() => setChoix(cle)}>
                    <span className="montee-offre-nom">{o.nom}</span>
                    <span className="montee-offre-prix">{euros(o.reduit)}</span>
                    <span className="montee-offre-facture">{o.facture}</span>
                  </button>
                );
              })}
            </div>

            <div className="montee-explication">
              <p className="montee-explication-titre">Ce qui se passe</p>
              <ul>
                <li><Check size={16} aria-hidden="true" /> Tu paies {euros(offre.reduit)} maintenant, {offre.jours ? `puis ${euros(offre.reduit)} ${offre.facture}, résiliable à tout moment` : 'une seule fois, pour toujours'}.</li>
                {resilie ? (
                  <li><Check size={16} aria-hidden="true" /> Ton abonnement {nomOffre(planKey)} est déjà résilié : il n’y a rien d’autre à arrêter.</li>
                ) : (
                  <>
                    <li><Check size={16} aria-hidden="true" /> Ton abonnement {nomOffre(planKey)} s’arrête tout de suite : plus aucun prélèvement.</li>
                    <li><Check size={16} aria-hidden="true" /> Les jours qui restaient sur ta période en cours ne sont pas remboursés.</li>
                  </>
                )}
                <li><Check size={16} aria-hidden="true" /> {aDejaLaTaille(planKey) ? 'Tu gardes tout ton plan et tes progrès.' : 'Ta taille estimée et ta courbe s’affichent dès que le paiement est validé. Tu gardes tout ton plan.'}</li>
              </ul>
            </div>

            {erreur && <p className="montee-erreur" role="alert">{erreur}</p>}

            <button type="button" className="montee-cta" onClick={payer} disabled={chargement}>
              {chargement ? 'Ouverture du paiement…' : `Passer à ${offre.jours ? offre.nom : 'l’offre À vie'} — ${euros(offre.reduit)}`}
            </button>
          </>
        )}
        <p className="montee-securite">Paiement sécurisé par Whop</p>
      </div>
    </div>
  );
}

// Ces offres ont déjà la taille estimée : ne pas la vendre une 2e fois.
function aDejaLaTaille(planKey) {
  return planKey === 'm3' || planKey === 'm3_normal' || planKey === 'annual';
}
