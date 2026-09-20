import { useCallback, useEffect, useState } from 'react';
import { Ruler, Sparkles, TrendingUp } from 'lucide-react';
import apiClient from '../lib/api';
import Spinner from '../components/Spinner';
import CourbeTaille from '../components/CourbeTaille';

function jourLocal() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

const nombre = (n) => String(n).replace('.', ',');

/* Ce que l'écran dit quand la vitesse n'est pas affichable.

   Le refus est nommé côté serveur, et chaque raison a sa propre suite.
   Un « données insuffisantes » unique laisserait l'utilisateur sans
   savoir s'il doit attendre, mesurer davantage, ou recommencer. */
const REFUS = {
  pas_assez_de_mesures:
    'Deux mesures au minimum. La première te donne une taille ; c’est la deuxième qui donne une trajectoire.',
  periode_trop_courte:
    'Il faut environ trois mois d’écart entre ta première et ta dernière mesure. Sur une période plus courte, l’erreur de mesure dépasse la croissance réelle et le chiffre ne voudrait rien dire.',
  trop_imprecis:
    'Tes mesures s’écartent trop pour qu’une vitesse fiable s’en dégage. Continue le protocole en trois relevés : la marge se resserre à chaque semaine.',
};

function ApercusPage() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);

  const charger = useCallback(() => {
    setChargement(true);
    apiClient
      .getApercus(jourLocal())
      .then((d) => {
        setDonnees(d);
        setPanne(false);
      })
      .catch(() => setPanne(true))
      .finally(() => setChargement(false));
  }, []);

  useEffect(charger, [charger]);

  if (chargement && !donnees) {
    return <Spinner size="page" label="Chargement de tes aperçus..." />;
  }

  if (panne) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <Sparkles size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Aperçus indisponibles</h2>
        <button type="button" className="accueil__reessayer" onClick={charger}>
          Réessayer
        </button>
      </div>
    );
  }

  const mesures = donnees?.mesures || [];
  const vitesse = donnees?.vitesse || {};
  const piliers = donnees?.piliers || [];
  const suivis = piliers.filter((p) => p.suivi);
  const plusFaible = suivis[0];

  /* Aucune mesure : l'écran nomme la porte au lieu de promettre.
     C'était le défaut relevé à l'audit — « dès que tu auras deux
     mesures » sans dire où les prendre. */
  if (mesures.length === 0) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <Ruler size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Aucune mesure enregistrée</h2>
        <p className="app-vide__texte">
          Prends ta mesure de la semaine depuis l’onglet Accueil. La courbe
          apparaît dès la deuxième.
        </p>
      </div>
    );
  }

  return (
    <section className="apercus">
      <h2 className="apercus__titre">Ta taille dans le temps</h2>

      {mesures.length >= 2 ? (
        <CourbeTaille mesures={mesures} />
      ) : (
        <p className="apercus__attente">
          Une seule mesure pour l’instant : {nombre(mesures[0].taille_cm)} cm.
          La courbe commence à la deuxième.
        </p>
      )}

      {/* ---------- Vitesse de croissance ---------- */}
      <div className="vitesse">
        <p className="vitesse__label">Vitesse de croissance</p>

        {vitesse.fiable ? (
          <>
            <p className="vitesse__chiffre">
              {nombre(vitesse.cm_par_an)}
              <span className="vitesse__unite"> cm/an</span>
            </p>
            {/* La marge est affichée à la même taille que le chiffre,
                pas en note de bas de page. Une vitesse sans son
                incertitude se lit comme une mesure exacte, alors qu'elle
                est une estimation issue d'une régression. */}
            <p className="vitesse__marge">
              ± {nombre(vitesse.marge)} cm/an · {vitesse.nb_mesures} mesures sur{' '}
              {vitesse.jours_couverts} jours
            </p>
          </>
        ) : (
          <p className="vitesse__refus">
            {REFUS[vitesse.pourquoi] || 'Pas encore calculable.'}
          </p>
        )}
      </div>

      {/* ---------- Piliers classés ---------- */}
      <h2 className="apercus__titre">Où il te reste le plus à gagner</h2>

      {plusFaible && (
        <div className="focus">
          <p className="focus__nom">{plusFaible.libelle}</p>
          <p className="focus__pct">{plusFaible.pct}%</p>
          <p className="focus__action">{plusFaible.action}</p>
        </div>
      )}

      <ul className="classement">
        {piliers.map((p) => (
          <li key={p.cle} className={`rang ${p.suivi ? '' : 'rang--inconnu'}`}>
            <span className="rang__nom">{p.libelle}</span>
            <span className="rang__pct">{p.suivi ? `${p.pct}%` : 'pas encore noté'}</span>
            <span className="rang__barre" aria-hidden="true">
              <span
                className="rang__barre-remplie"
                style={{ width: `${p.suivi ? p.pct : 0}%` }}
              />
            </span>
          </li>
        ))}
      </ul>

      <p className="apercus__note">
        <TrendingUp size={14} aria-hidden="true" />
        Le classement part du pilier le plus faible : c’est là qu’une semaine
        d’effort se voit le plus.
      </p>
    </section>
  );
}

export default ApercusPage;
