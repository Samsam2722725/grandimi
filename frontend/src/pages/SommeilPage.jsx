import { useCallback, useEffect, useState } from 'react';
import { Minus, Moon, Plus, Trash2 } from 'lucide-react';
import apiClient from '../lib/api';
import Spinner from '../components/Spinner';
import GrapheSommeil from '../components/GrapheSommeil';

function jourLocal(decalage = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/* Saisie par pas de trente minutes, avec deux boutons.

   Pas un champ libre : personne ne connaît sa nuit à la minute près, et
   un clavier numérique pour taper « 8,5 » demande trois gestes là où
   deux appuis suffisent. Pas une roulette non plus — il y a seize
   valeurs plausibles, ce qui tient dans un incrément.

   Les bornes viennent du serveur (0 < h < 24) ; celles-ci sont plus
   serrées parce qu'elles bornent ce qu'on peut ATTEINDRE en appuyant,
   pas ce qu'on peut enregistrer. */
const PAS = 0.5;
const MIN = 3;
const MAX = 14;

function formater(h) {
  return String(h).replace('.', ',');
}

function SommeilPage() {
  const aujourdhui = jourLocal();
  const [jour, setJour] = useState(aujourdhui);
  const [semaine, setSemaine] = useState(null);
  const [heures, setHeures] = useState(8);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(
    (jourSelectionne) => {
      setChargement(true);
      apiClient
        .getSemaineSommeil(jourLocal(-6))
        .then((d) => {
          setSemaine(d);
          setPanne(false);
          /* Le curseur part de la valeur DÉJÀ enregistrée pour le jour
             sélectionné, pas de 8 h. Sans ça, ouvrir une nuit notée à
             6 h affiche 8 h, et un appui sur « Enregistrer » la
             réécrirait silencieusement. */
          const nuit = (d.nuits || []).find((n) => n.jour === jourSelectionne);
          if (nuit?.saisi) setHeures(nuit.heures);
        })
        .catch(() => setPanne(true))
        .finally(() => setChargement(false));
    },
    [],
  );

  useEffect(() => {
    charger(jour);
  }, [charger, jour]);

  if (chargement && !semaine) {
    return <Spinner size="page" label="Chargement de ton sommeil..." />;
  }

  if (panne) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <Moon size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Sommeil indisponible</h2>
        <button type="button" className="accueil__reessayer" onClick={() => charger(jour)}>
          Réessayer
        </button>
      </div>
    );
  }

  const nuits = semaine?.nuits || [];
  const nuitDuJour = nuits.find((n) => n.jour === jour);
  const objectif = semaine?.objectif || 9;

  const enregistrer = () => {
    setEnvoi(true);
    apiClient
      .enregistrerSommeil({ heures, jour })
      .catch(() => {})
      .finally(() => {
        setEnvoi(false);
        charger(jour);
      });
  };

  return (
    <section className="dodo">
      <header className="dodo__entete">
        <h2 className="dodo__titre">Tes sept dernières nuits</h2>
        {semaine?.score_note ? (
          <p className="dodo__score">
            <strong>{semaine.score}%</strong> de ton objectif
          </p>
        ) : (
          <p className="dodo__score dodo__score--vide">Rien de noté cette semaine</p>
        )}
      </header>

      <GrapheSommeil
        nuits={nuits}
        objectif={objectif}
        aujourdhui={aujourdhui}
        onChoisir={setJour}
      />

      <div className="dodo__saisie">
        <p className="dodo__label">
          {jour === aujourdhui ? 'La nuit dernière' : `Le ${jour.slice(8)}/${jour.slice(5, 7)}`}
        </p>

        <div className="dodo__reglage">
          <button
            type="button"
            className="dodo__pas"
            aria-label="Trente minutes de moins"
            disabled={heures <= MIN}
            onClick={() => setHeures((h) => Math.max(MIN, h - PAS))}
          >
            <Minus size={20} aria-hidden="true" />
          </button>

          <p className="dodo__heures" aria-live="polite">
            {formater(heures)}
            <span className="dodo__unite">h</span>
          </p>

          <button
            type="button"
            className="dodo__pas"
            aria-label="Trente minutes de plus"
            disabled={heures >= MAX}
            onClick={() => setHeures((h) => Math.min(MAX, h + PAS))}
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="dodo__valider"
          disabled={envoi}
          onClick={enregistrer}
        >
          {envoi ? 'Enregistrement…' : nuitDuJour?.saisi ? 'Corriger' : 'Enregistrer'}
        </button>

        {/* Effacer, et pas seulement corriger : sans ça, une faute de
            frappe à 14 h resterait pour toujours et la seule façon de
            s'en débarrasser serait d'inscrire une valeur également
            fausse. */}
        {nuitDuJour?.saisi && (
          <button
            type="button"
            className="dodo__effacer"
            onClick={() => {
              apiClient.supprimerSommeil(jour).finally(() => charger(jour));
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            Effacer cette nuit
          </button>
        )}
      </div>

      {/* Le niveau de preuve, à l'écran. La majorité de la sécrétion
          d'hormone de croissance survient en sommeil lent, et une
          privation sévère et chronique altère la croissance — cela est
          établi. Qu'ajouter une heure à quelqu'un qui dort déjà huit
          heures le fasse grandir ne l'est pas, et l'écran ne doit pas
          le suggérer. */}
      <p className="dodo__note">
        Une privation de sommeil sévère et durable freine la croissance.
        Dormir plus que ton besoin ne la pousse pas pour autant : l’objectif
        est d’être dans la plage, pas de la dépasser.
      </p>
    </section>
  );
}

export default SommeilPage;
