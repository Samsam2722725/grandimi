import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import apiClient from '../lib/api';
import Spinner from '../components/Spinner';
import BandeauJours from '../components/BandeauJours';
import AjoutAliment from '../components/AjoutAliment';

function jourLocal(decalage = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/* Les quatre compteurs.

   Ce sont les seuls nutriments sur lesquels un adolescent occidental
   peut avoir un écart qui compte ET qu'un journal déclaratif peut
   mesurer. Le zinc, le fer et l'iode comptent aussi — mais seulement en
   population carencée, et pas à la précision d'un journal. Les ajouter
   donnerait une fausse impression de complétude.

   L'ordre n'est pas neutre : l'énergie d'abord, parce qu'un déficit
   énergétique chronique arrête la croissance avant que le moindre
   micronutriment n'entre en jeu. */
const COMPTEURS = [
  { cle: 'kcal', objectif: 'kcal', libelle: 'Calories', unite: 'kcal', emoji: '🔥' },
  { cle: 'proteines_g', objectif: 'proteines_g', libelle: 'Protéines', unite: 'g', emoji: '💪' },
  { cle: 'calcium_mg', objectif: 'calcium_mg', libelle: 'Calcium', unite: 'mg', emoji: '🦴' },
  { cle: 'vit_d_ui', objectif: 'vit_d_ui', libelle: 'Vitamine D', unite: 'UI', emoji: '☀️' },
];

const LIBELLE_MOMENT = {
  'petit-dej': 'Petit-déj',
  dejeuner: 'Déjeuner',
  gouter: 'Goûter',
  diner: 'Dîner',
  autre: 'Autre',
};

function NutritionPage() {
  const aujourdhui = jourLocal();
  const [jour, setJour] = useState(aujourdhui);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  const charger = useCallback((j) => {
    setChargement(true);
    apiClient
      .getNutritionJour(j)
      .then((d) => {
        setDonnees(d);
        setPanne(false);
      })
      .catch(() => setPanne(true))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    charger(jour);
  }, [charger, jour]);

  if (chargement && !donnees) {
    return <Spinner size="page" label="Chargement de ton journal..." />;
  }

  if (panne) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <UtensilsCrossed size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Journal indisponible</h2>
        <button type="button" className="accueil__reessayer" onClick={() => charger(jour)}>
          Réessayer
        </button>
      </div>
    );
  }

  if (ajoutOuvert) {
    return (
      <AjoutAliment
        jour={jour}
        onFerme={() => setAjoutOuvert(false)}
        onAjoute={() => {
          setAjoutOuvert(false);
          charger(jour);
        }}
      />
    );
  }

  const totaux = donnees?.totaux || {};
  const objectifs = donnees?.objectifs || {};
  const repas = donnees?.repas || [];

  /* Le bandeau n'a pas de source côté nutrition : il n'existe pas
     d'endpoint « ma semaine de repas ». Plutôt que d'en ajouter un pour
     colorier sept pastilles, on affiche les sept jours sans état. Le
     jour sélectionné reste changeable, ce qui est sa fonction
     principale. */
  const semaine = Array.from({ length: 7 }, (_, i) => ({
    jour: jourLocal(i - 6),
    faits: 0,
    total: 0,
  }));

  return (
    <section className="nutri">
      <BandeauJours
        jours={semaine}
        actif={jour}
        aujourdhui={aujourdhui}
        onChoisir={setJour}
      />

      <ul className="compteurs">
        {COMPTEURS.map((c) => {
          const valeur = totaux[c.cle] || 0;
          const cible = objectifs[c.objectif] || 0;
          const pct = cible ? Math.min(100, Math.round((valeur / cible) * 100)) : 0;
          /* Le dépassement est signalé, jamais masqué par le plafond à
             100 % de la barre : 3000 UI de vitamine D affichés comme
             « 100 % atteint » cacheraient exactement ce qu'il faut
             voir. */
          const depasse = cible > 0 && valeur > cible * 1.2;

          return (
            <li key={c.cle} className={`compteur ${depasse ? 'compteur--depasse' : ''}`}>
              <span className="compteur__emoji" aria-hidden="true">{c.emoji}</span>
              <span className="compteur__nom">{c.libelle}</span>
              <span className="compteur__valeur">
                {Math.round(valeur)}
                <span className="compteur__cible"> / {cible} {c.unite}</span>
              </span>
              <span className="compteur__barre" aria-hidden="true">
                <span className="compteur__barre-remplie" style={{ width: `${pct}%` }} />
              </span>
              <span className="sr-only">
                {Math.round(valeur)} sur {cible} {c.unite}
                {depasse ? ', objectif dépassé' : ''}
              </span>
            </li>
          );
        })}
      </ul>

      {/* La précision réelle du catalogue est de l'ordre de ±15 % selon
          la variété, la cuisson et la marque. Le dire évite de laisser
          croire qu'« il te manque 12 g de protéines » est un chiffre
          exact — et c'est ce qui distingue un outil d'un oracle. */}
      <p className="nutri__note">
        Valeurs de référence, à ±15 % près. De quoi repérer un écart, pas
        de quoi peser des rations.
      </p>

      {repas.length === 0 ? (
        <p className="nutri__vide">Rien de noté pour ce jour.</p>
      ) : (
        <ul className="repas">
          {repas.map((r) => (
            <li key={r.id} className="repas__ligne">
              <span className="repas__texte">
                <span className="repas__nom">{r.libelle}</span>
                <span className="repas__detail">
                  {LIBELLE_MOMENT[r.moment] || r.moment} · {Math.round(r.quantite_g)} g ·{' '}
                  {Math.round(r.kcal)} kcal
                </span>
              </span>
              <button
                type="button"
                className="repas__supprimer"
                aria-label={`Retirer ${r.libelle}`}
                onClick={() => {
                  apiClient.supprimerRepas(r.id).finally(() => charger(jour));
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="nutri__ajouter" onClick={() => setAjoutOuvert(true)}>
        <Plus size={18} aria-hidden="true" />
        Ajouter un aliment
      </button>
    </section>
  );
}

export default NutritionPage;
