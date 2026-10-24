import { useState } from 'react';

import { heuresRepas, numeroDuJour, repasDuJour } from '@/lib/menus';

/* « Tes repas ! », copié de l'onglet Nutrition de Taller : les repas du
   jour avec protéines, glucides et lipides, une note sur 10, et la recette
   qui apparaît quand on touche la carte. Pas de photo : un emoji dans une
   assiette.

   Ce qui est à lui (lib/menus.js) : les portions suivent son objectif de
   protéines, les heures suivent son réveil et son coucher, son régime
   écarte ce qu'il ne mange pas, et une collation s'ajoute si ses
   protéines ou son calcium sont faibles. */

// La hauteur de chaque petite jauge : sur 40 g, comme les barres de Taller.
const MACROS = [
  { cle: 'p', nom: 'Protéines', couleur: '#f0705a' },
  { cle: 'g', nom: 'Glucides', couleur: '#f5c542' },
  { cle: 'l', nom: 'Lipides', couleur: '#ff8a52' },
];

// Le régime se choisit au premier lancement et dans ⚙︎ (Mes préférences).
export function RepasDuJour({ plan, prediction, regime = 'tout' }) {
  const [ouverts, setOuverts] = useState(() => new Set());
  const basculer = (id) => setOuverts((o) => {
    const suivant = new Set(o);
    if (suivant.has(id)) suivant.delete(id);
    else suivant.add(id);
    return suivant;
  });

  const h = prediction?.habitudes || {};
  const collation = h.proteines === 'rarement' || h.proteines === 'un-repas' || h.laitages === 'aucun' || h.laitages === '1-2';
  const objectifP = Number(plan?.nutrition?.protein_g) || 80;
  const objectifCa = Number(plan?.nutrition?.calcium_mg) || 1300;
  const { repas, totalP, totalCa } = repasDuJour({
    jour: numeroDuJour(),
    regime,
    objectifP,
    objectifCa,
    collation,
    heures: heuresRepas(plan?.sleep?.waketime, plan?.sleep?.bedtime),
  });

  return (
    <div className="repas">
      <p className="repas-intro">
        Suis les repas d’aujourd’hui pour atteindre ton potentiel de taille. Ils changent chaque jour <span aria-hidden="true">⏰</span>
        <span className="repas-objectif">
          Ton objectif : {objectifP} g de protéines · {objectifCa.toLocaleString('fr-FR')} mg de calcium.
          Aujourd’hui : {totalP} g · {totalCa.toLocaleString('fr-FR')} mg.
        </span>
      </p>


      {repas.map((r) => {
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
                <span className="repas-moment">{r.moment}</span>
                <span className="repas-nom">{r.nom}</span>
                <span className="repas-macros">
                  {MACROS.map((m) => (
                    <span key={m.cle} className="repas-macro">
                      <span className="repas-jauge" aria-hidden="true"><span style={{ height: `${Math.min(100, (r[m.cle] / 40) * 100)}%`, background: m.couleur }} /></span>
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

      {regime === 'halal' && <p className="repas-astuce">Prends une viande halal pour les repas avec de la viande.</p>}
      <p className="repas-astuce"><span aria-hidden="true">💡</span> Touche chaque carte pour voir la recette</p>
    </div>
  );
}
