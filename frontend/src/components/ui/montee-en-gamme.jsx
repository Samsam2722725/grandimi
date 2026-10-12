import { useState } from 'react';
import { Check, X } from 'lucide-react';

import apiClient from '@/lib/api';
import { OFFRES, euros } from '@/lib/offres';
import { capture } from '@/lib/analytics';

/* Passer de l'offre 1 mois à 3 mois ou À vie, depuis « Ma taille ».

   Règle (12/10/2026) : il paie la nouvelle offre maintenant, son 1 mois
   s'arrête tout de suite chez Whop (internal/api/montee_en_gamme.go), et
   les jours restants ne sont pas remboursés. On le lui dit AVANT qu'il
   paie, en clair. Prix : le tarif réduit du paywall. */
const CHOIX = ['m3', 'vie'];

export function MonteeEnGamme({ predictionData, onFermer }) {
  const [choix, setChoix] = useState('m3');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const offre = OFFRES.find((o) => o.duree === choix);

  const payer = async () => {
    setErreur(null);
    setChargement(true);
    try {
      const utilisateur = JSON.parse(localStorage.getItem('user') || '{}');
      const email = predictionData.email || localStorage.getItem('userEmail') || '';
      capture('montee_en_gamme', { etape: choix });
      const { checkout_url: url } = await apiClient.createCheckout({ email, userId: utilisateur.id, plan: choix });
      if (!url) throw new Error('');
      window.location.href = url;
    } catch {
      setErreur('Impossible d’ouvrir le paiement. Réessaie dans un instant.');
      setChargement(false);
    }
  };

  return (
    <div className="montee" role="dialog" aria-label="Passer à une offre supérieure" onClick={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="montee-panneau">
        <div className="montee-haut">
          <h2>Débloque ta taille adulte estimée</h2>
          <button type="button" className="seance-fermer" onClick={onFermer} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="montee-offres" role="radiogroup">
          {CHOIX.map((cle) => {
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
            <li><Check size={16} aria-hidden="true" /> Tu paies {euros(offre.reduit)} maintenant, {offre.jours ? 'pour 3 mois' : 'une seule fois, pour toujours'}.</li>
            <li><Check size={16} aria-hidden="true" /> Ton abonnement 1 mois s’arrête tout de suite : plus aucun prélèvement de 14,99 €.</li>
            <li><Check size={16} aria-hidden="true" /> Les jours qui restaient sur ton mois en cours ne sont pas remboursés.</li>
            <li><Check size={16} aria-hidden="true" /> Ta taille estimée et ta courbe s’affichent dès que le paiement est validé. Tu gardes tout ton plan.</li>
          </ul>
        </div>

        {erreur && <p className="funnel-error" role="alert">{erreur}</p>}

        <button type="button" className="funnel-cta montee-cta" onClick={payer} disabled={chargement}>
          {chargement ? 'Ouverture du paiement…' : `Passer à ${offre.nom === 'À vie' ? 'l’offre À vie' : '3 mois'} — ${euros(offre.reduit)}`}
        </button>
        <p className="montee-securite">Paiement sécurisé par Whop</p>
      </div>
    </div>
  );
}
