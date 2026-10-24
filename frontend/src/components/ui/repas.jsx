import { useState } from 'react';

/* « Tes repas ! », copié de l'onglet Nutrition de Taller : 3 repas du jour
   (8 h, 13 h, 19 h), avec les protéines, glucides et lipides, une note sur
   10, et la recette qui apparaît quand on touche la carte.

   Pour l'instant, ce sont exactement les 3 repas vus chez Taller (compte
   gratuit), traduits. Les jours suivants et la personnalisation viendront
   après. Pas de photo : un emoji dans une assiette. */

export const REPAS_DU_JOUR = [
  {
    id: 'bol-quinoa-matin',
    nom: 'Bol de quinoa du matin',
    emoji: '🫐',
    garniture: '🍓',
    heure: '8 h',
    prot: 9, gluc: 14, lip: 4, score: 9,
    recette: ['50 g de quinoa cuit', '50 g de fruits rouges', '1 cuillère à soupe de graines de courge', '1 cuillère à café de miel'],
  },
  {
    id: 'bol-quinoa-haricots',
    nom: 'Bol quinoa et haricots noirs',
    emoji: '🫘',
    garniture: '🌽',
    heure: '13 h',
    prot: 9, gluc: 15, lip: 4, score: 8,
    recette: ['50 g de quinoa cuit', '50 g de haricots noirs égouttés', '10 g de maïs', '1 cuillère à soupe de salsa', 'Une poignée de coriandre fraîche'],
  },
  {
    id: 'boulettes-dinde',
    nom: 'Boulettes de dinde et spaghettis de courgette',
    emoji: '🧆',
    garniture: '🥒',
    heure: '19 h',
    prot: 12, gluc: 10, lip: 5, score: 6,
    recette: ['50 g de dinde hachée', '50 g de spaghettis de courgette', 'Sauce tomate', 'Ail', 'Basilic'],
  },
];

// La hauteur de chaque petite jauge : sur 20 g, comme les barres de Taller.
const MACROS = [
  { cle: 'prot', nom: 'Protéines', couleur: '#f0705a' },
  { cle: 'gluc', nom: 'Glucides', couleur: '#f5c542' },
  { cle: 'lip', nom: 'Lipides', couleur: '#ff8a52' },
];

export function RepasDuJour() {
  const [ouverts, setOuverts] = useState(() => new Set());
  const basculer = (id) => setOuverts((o) => {
    const suivant = new Set(o);
    if (suivant.has(id)) suivant.delete(id);
    else suivant.add(id);
    return suivant;
  });

  return (
    <div className="repas">
      <p className="repas-intro">Suis les repas d’aujourd’hui pour atteindre ton potentiel de taille. Ils changent chaque jour <span aria-hidden="true">⏰</span></p>

      {REPAS_DU_JOUR.map((r) => {
        const ouvert = ouverts.has(r.id);
        return (
          <button key={r.id} type="button" className={`repas-carte ${ouvert ? 'ouvert' : ''}`} onClick={() => basculer(r.id)} aria-expanded={ouvert}>
            <span className="repas-assiette" aria-hidden="true">
              <span className="repas-emoji">{r.emoji}</span>
              <span className="repas-garniture">{r.garniture}</span>
            </span>
            {ouvert ? (
              <span className="repas-recette">
                <span className="repas-nom">{r.nom}</span>
                {r.recette.map((ligne) => (
                  <span key={ligne} className="repas-ingredient"><span aria-hidden="true">👉</span> {ligne}</span>
                ))}
              </span>
            ) : (
              <span className="repas-infos">
                <span className="repas-nom">{r.nom}</span>
                <span className="repas-macros">
                  {MACROS.map((m) => (
                    <span key={m.cle} className="repas-macro">
                      <span className="repas-jauge" aria-hidden="true"><span style={{ height: `${Math.min(100, (r[m.cle] / 20) * 100)}%`, background: m.couleur }} /></span>
                      <span className="repas-macro-textes">
                        <span className="repas-macro-valeur">{r[m.cle]} g</span>
                        <span className="repas-macro-nom">{m.nom}</span>
                      </span>
                    </span>
                  ))}
                </span>
                <span className="repas-bas">
                  <span className="repas-score"><span aria-hidden="true">🚀</span> Score : {r.score}/10</span>
                  <span className="repas-heure">{r.heure}</span>
                </span>
              </span>
            )}
          </button>
        );
      })}

      <p className="repas-astuce"><span aria-hidden="true">💡</span> Touche chaque carte pour voir la recette</p>
    </div>
  );
}
