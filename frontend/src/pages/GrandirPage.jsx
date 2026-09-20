import { useCallback, useEffect, useState } from 'react';
import { Check, Dumbbell, Play } from 'lucide-react';
import apiClient from '../lib/api';
import Spinner from '../components/Spinner';
import BandeauJours from '../components/BandeauJours';
import SeancePage from './SeancePage';

// Jour LOCAL au format ISO. `toISOString()` bascule en UTC et rend la
// veille ou le lendemain selon l'heure.
function jourLocal(decalage = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/* L'onglet Grandir.

   Le bandeau commence SIX JOURS EN ARRIÈRE et finit aujourd'hui, au
   lieu de partir d'aujourd'hui vers l'avenir. Ce que le concurrent
   affiche — aujourd'hui puis six jours à venir — donne un écran où six
   cases sur sept sont vides par construction, et où l'on ne peut jamais
   rattraper la veille. Montrer ce qui vient d'être fait rend la série
   visible et laisse cocher un oubli. */
function GrandirPage({ onVoirPlanComplet }) {
  const aujourdhui = jourLocal();
  const [jourChoisi, setJourChoisi] = useState(aujourdhui);
  const [seance, setSeance] = useState(null);
  const [semaine, setSemaine] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);
  const [enSeance, setEnSeance] = useState(false);

  const charger = useCallback(
    (jour) => {
      setChargement(true);
      Promise.all([
        apiClient.getSeanceDuJour(jour),
        apiClient.getSemaineSeances(jourLocal(-6)),
      ])
        .then(([s, w]) => {
          setSeance(s);
          setSemaine(w.jours || []);
          setPanne(false);
        })
        .catch(() => setPanne(true))
        .finally(() => setChargement(false));
    },
    [],
  );

  useEffect(() => {
    charger(jourChoisi);
  }, [charger, jourChoisi]);

  const basculer = (slug) => {
    /* Mise à jour optimiste : cocher doit répondre au doigt. Un
       aller-retour réseau avant que la case change fait taper deux
       fois, et la seconde décoche. */
    setSeance((s) => ({
      ...s,
      exercices: s.exercices.map((e) =>
        e.slug === slug ? { ...e, fait: !e.fait } : e,
      ),
    }));

    apiClient
      .basculerExercice({ slug, jour: jourChoisi })
      // En cas d'échec on relit : l'écran doit montrer ce qui est
      // enregistré, pas ce qu'on espérait enregistrer.
      .catch(() => charger(jourChoisi));
  };

  if (chargement && !seance) {
    return <Spinner size="page" label="Chargement de ta séance..." />;
  }

  if (panne) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <Dumbbell size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Séance indisponible</h2>
        <p className="app-vide__texte">Ta séance du jour n’a pas pu être chargée.</p>
        <button type="button" className="accueil__reessayer" onClick={() => charger(jourChoisi)}>
          Réessayer
        </button>
      </div>
    );
  }

  const exercices = seance?.exercices || [];
  const faits = exercices.filter((e) => e.fait).length;
  const pct = exercices.length ? Math.round((faits / exercices.length) * 100) : 0;
  const minutes = Math.round((seance?.duree_total_sec || 0) / 60);
  const restants = exercices.filter((e) => !e.fait);

  if (enSeance) {
    return (
      <SeancePage
        /* La séance ne rejoue QUE ce qui reste. Refaire les six depuis le
           début quand cinq sont cochés, c'est punir celui qui a validé au
           fil de l'eau. */
        exercices={restants.length ? restants : exercices}
        onQuitter={() => setEnSeance(false)}
        onTermine={(slugs) => {
          setEnSeance(false);
          if (!slugs.length) return;
          apiClient
            .validerSeance({ slugs, jour: jourChoisi })
            .finally(() => charger(jourChoisi));
        }}
      />
    );
  }

  return (
    <section className="grandir">
      <header className="grandir__entete">
        <p className="grandir__pct">
          <strong>{pct}%</strong>
        </p>
        <p className="grandir__compte">
          {faits} sur {exercices.length} fait{faits > 1 ? 's' : ''}
          <span className="grandir__duree">· {minutes} min</span>
        </p>
      </header>

      <span className="grandir__barre" aria-hidden="true">
        <span className="grandir__barre-remplie" style={{ width: `${pct}%` }} />
      </span>

      <BandeauJours
        jours={semaine}
        actif={jourChoisi}
        aujourdhui={aujourdhui}
        onChoisir={setJourChoisi}
      />

      {restants.length > 0 && (
        <button type="button" className="grandir__cta" onClick={() => setEnSeance(true)}>
          <Play size={18} aria-hidden="true" />
          {faits === 0 ? "Aller à l'entraînement" : 'Finir la séance'}
        </button>
      )}

      <ul className="exos">
        {exercices.map((e) => (
          <li key={e.slug}>
            <button
              type="button"
              className={`exo ${e.fait ? 'exo--fait' : ''}`}
              aria-pressed={e.fait}
              onClick={() => basculer(e.slug)}
            >
              <span className="exo__case" aria-hidden="true">
                {e.fait && <Check size={14} />}
              </span>
              <span className="exo__texte">
                <span className="exo__nom">{e.nom}</span>
                {/* Le bénéfice réel, sous chaque exercice.
                    Aucun essai contrôlé ne montre qu'un étirement augmente
                    la taille adulte ; ce champ dit lequel des deux effets
                    réels s'applique — décompression du jour, ou posture
                    durable — plutôt que de laisser une promesse vague
                    couvrir l'écran. */}
                <span className="exo__benefice">{e.benefice}</span>
              </span>
              <span className="exo__duree">{e.duree_sec}s</span>
            </button>
          </li>
        ))}
      </ul>

      {onVoirPlanComplet && (
        <button type="button" className="grandir__lien" onClick={onVoirPlanComplet}>
          Voir le plan du mois en entier
        </button>
      )}
    </section>
  );
}

export default GrandirPage;
