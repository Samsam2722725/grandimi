import { useEffect, useState } from 'react';

import { capture } from '@/lib/analytics';

/* Visite guidée à la première ouverture de l'app (comme GoTall :
   « 2 sur 7 · Suivant »). Quatre bulles, chacune pointe une zone de
   l'écran « Aujourd'hui » : on la fait défiler au centre et on la
   surligne. Vue une seule fois par appareil. */
const CLE = 'grandimi:visite-faite';

const ETAPES = [
  { selecteur: '.taille-accueil', texte: 'Ta taille : où tu en es, ta courbe et les points à corriger. Mets-la à jour chaque mois.' },
  { selecteur: '.app-nav', texte: 'Grandir : ton parcours jour par jour et tes séances. Routine : ta liste du jour et ta série 🔥.' },
];

export function visiteDejaVue() {
  try {
    return localStorage.getItem(CLE) === '1';
  } catch {
    return true;
  }
}

export function VisiteGuidee({ onFin }) {
  const [etape, setEtape] = useState(0);

  useEffect(() => {
    const el = document.querySelector(ETAPES[etape].selecteur);
    if (!el) return undefined;
    if (ETAPES[etape].selecteur !== '.app-nav') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('app-surligne');
    return () => el.classList.remove('app-surligne');
  }, [etape]);

  const finir = () => {
    capture('visite_finie', { etape: etape === ETAPES.length - 1 ? 'fin' : `passee-${etape + 1}` });
    try {
      localStorage.setItem(CLE, '1');
    } catch {
      /* stockage refusé : elle reviendra, ce n'est pas grave */
    }
    onFin();
  };

  const derniere = etape === ETAPES.length - 1;
  return (
    <div className="visite" role="dialog" aria-label="Visite guidée">
      <div className="visite-bulle">
        <p className="visite-texte">{ETAPES[etape].texte}</p>
        <div className="visite-bas">
          <span className="visite-compte">{etape + 1} sur {ETAPES.length}</span>
          <span className="visite-actions">
            {!derniere && (
              <button type="button" className="visite-passer" onClick={finir}>Passer</button>
            )}
            <button type="button" className="visite-suivant" onClick={derniere ? finir : () => setEtape(etape + 1)}>
              {derniere ? 'C’est parti' : 'Suivant'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
