import { useCallback, useEffect, useState } from 'react';
import { Ruler, TrendingUp } from 'lucide-react';
import apiClient from '../lib/api';
import Spinner from '../components/Spinner';
import AnneauCroissance from '../components/AnneauCroissance';
import CompteARebours from '../components/CompteARebours';
import SerieConnexions from '../components/SerieConnexions';

/* Le jour LOCAL du téléphone, au format ISO.

   `toISOString()` est volontairement évité : il convertit en UTC et rend
   donc la veille ou le lendemain selon l'heure. Pour quelqu'un qui ouvre
   l'application à 0 h 30 en France l'été, la connexion serait comptée sur
   la veille — et sa série casserait le lendemain sans qu'il ait rien
   manqué. */
function jourLocal(date = new Date()) {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function AccueilPage({ predictionData, onAllerAuPlan }) {
  const [tableau, setTableau] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);

  const charger = useCallback(() => {
    let annule = false;
    apiClient
      .getDashboard(jourLocal())
      .then((res) => {
        if (!annule) {
          setTableau(res);
          setPanne(false);
        }
      })
      /* Une panne réseau ne doit pas vider l'écran : l'estimation vient
         du questionnaire et vit dans le stockage local, elle s'affiche
         sans le serveur. Seuls la série et les piliers manquent, et on
         le dit plutôt que de montrer des zéros — un zéro se lit comme
         « tu n'as rien fait », pas comme « je n'ai pas pu lire ». */
      .catch(() => {
        if (!annule) setPanne(true);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, []);

  useEffect(charger, [charger]);

  const estimation = predictionData?.predicted_height_cm;
  const intervalle = predictionData?.confidence_range;
  const segments = tableau?.segments || [];

  if (chargement) {
    return <Spinner size="page" label="Chargement de ton suivi..." />;
  }

  return (
    <section className="accueil">
      {/* ---------- Prochaine mesure ----------
          Masquée en cas de panne : sans réponse du serveur, le rebours
          vaudrait zéro et l'écran proposerait « Mesurer ma taille » alors
          qu'on ignore si la semaine est écoulée. Proposer un geste qui
          sera refusé juste après est pire que ne rien proposer. */}
      {!panne && (
        <div className="accueil__rebours-zone">
          <p className="accueil__rebours-label">
            {tableau?.verrouille ? 'Prochaine mesure dans' : 'Ta mesure de la semaine'}
          </p>
          <CompteARebours
            secondes={tableau?.secondes_avant_mesure || 0}
            onDeverrouiller={onAllerAuPlan}
          />
        </div>
      )}

      {/* ---------- L'anneau ---------- */}
      <AnneauCroissance
        segments={segments}
        enfants={
          estimation ? (
            <>
              <p className="accueil__label">Taille projetée</p>
              <p className="accueil__chiffre">{Math.round(estimation)}</p>
              {intervalle?.min != null && intervalle?.max != null && (
                <p className="accueil__intervalle">
                  {Math.round(intervalle.min)}–{Math.round(intervalle.max)} cm
                </p>
              )}
            </>
          ) : (
            <>
              <Ruler size={22} aria-hidden="true" />
              <p className="accueil__intervalle">Pas encore d'estimation</p>
            </>
          )
        }
      />

      {/* Le pourcentage est calculé sur les SEULS piliers suivis. Diviser
          par six alors que trois ne sont pas mesurables plafonnerait tout
          le monde à 50 %, quoi qu'il fasse — et le chiffre remonterait
          tout seul aux étapes suivantes, sans que personne n'ait rien
          fait. */}
      {!panne && (
        <p className="accueil__progression">
          <strong>{tableau?.progression_pct ?? 0}%</strong> de ta semaine
        </p>
      )}

      {/* ---------- Les six piliers, en texte ---------- */}
      {!panne && (
        <ul className="piliers">
          {segments.map((s) => (
            <li key={s.cle} className={`pilier ${s.suivi ? '' : 'pilier--futur'}`}>
              <span className="pilier__nom">{s.libelle}</span>
              <span className="pilier__valeur">
                {s.suivi ? `${s.pct}%` : 'bientôt'}
              </span>
              <span className="pilier__barre" aria-hidden="true">
                <span
                  className="pilier__barre-remplie"
                  style={{ width: `${s.suivi ? s.pct : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Série ---------- */}
      {!panne && <SerieConnexions serie={tableau?.serie} />}

      {panne && (
        <div className="accueil__panne">
          <p>Ton suivi n'a pas pu être chargé.</p>
          <button type="button" className="accueil__reessayer" onClick={charger}>
            Réessayer
          </button>
        </div>
      )}

      <button type="button" className="accueil__cta" onClick={onAllerAuPlan}>
        <TrendingUp size={18} aria-hidden="true" />
        Voir mon plan du jour
      </button>
    </section>
  );
}

export default AccueilPage;
