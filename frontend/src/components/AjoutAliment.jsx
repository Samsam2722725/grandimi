import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import apiClient from '../lib/api';

/* L'ajout d'un aliment : chercher, choisir, régler la quantité.

   Deux temps, pas un formulaire unique. Un écran qui demande à la fois
   l'aliment et la quantité oblige à décider du poids avant d'avoir vu la
   portion usuelle qu'on propose, et c'est précisément ce chiffre qui
   évite d'aller chercher une balance. */

const MOMENTS = [
  ['petit-dej', 'Petit-déj'],
  ['dejeuner', 'Déjeuner'],
  ['gouter', 'Goûter'],
  ['diner', 'Dîner'],
];

// Le moment le plus probable selon l'heure : c'est presque toujours le
// bon, et il reste modifiable d'un geste.
function momentProbable() {
  const h = new Date().getHours();
  if (h < 11) return 'petit-dej';
  if (h < 15) return 'dejeuner';
  if (h < 18) return 'gouter';
  return 'diner';
}

function AjoutAliment({ jour, onFerme, onAjoute }) {
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState([]);
  const [choisi, setChoisi] = useState(null);
  const [quantite, setQuantite] = useState('');
  const [moment, setMoment] = useState(momentProbable);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const champ = useRef(null);

  useEffect(() => {
    champ.current?.focus();
  }, []);

  /* Recherche différée de 200 ms.

     Sans ce délai, taper « fromage » lance sept requêtes dont six sont
     déjà périmées quand elles reviennent — et rien ne garantit qu'elles
     reviennent dans l'ordre : la liste peut finir sur le résultat de
     « fro » alors que le champ affiche « fromage ». Le drapeau `annule`
     règle ce second point même quand une requête part. */
  useEffect(() => {
    if (q.trim().length < 2) {
      setResultats([]);
      return undefined;
    }

    let annule = false;
    const t = setTimeout(() => {
      apiClient
        .chercherAliments(q)
        .then((r) => {
          if (!annule) setResultats(r.aliments || []);
        })
        .catch(() => {
          if (!annule) setResultats([]);
        });
    }, 200);

    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, [q]);

  const valider = async () => {
    const g = Number.parseFloat(String(quantite).replace(',', '.'));
    if (!Number.isFinite(g) || g <= 0) {
      setErreur('Indique une quantité.');
      return;
    }

    setEnvoi(true);
    setErreur(null);
    try {
      await apiClient.ajouterRepas({
        slug: choisi.slug,
        quantiteG: g,
        moment,
        jour,
      });
      onAjoute?.();
    } catch (e) {
      setErreur(e.message || 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="ajout" role="dialog" aria-modal="true" aria-label="Ajouter un aliment">
      <header className="ajout__entete">
        <button
          type="button"
          className="ajout__retour"
          onClick={() => (choisi ? setChoisi(null) : onFerme())}
          aria-label="Revenir"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h2 className="ajout__titre">{choisi ? choisi.nom : 'Ajouter un aliment'}</h2>
      </header>

      {!choisi ? (
        <>
          <label className="ajout__recherche">
            <Search size={18} aria-hidden="true" />
            <input
              ref={champ}
              type="search"
              placeholder="Yaourt, poulet, pâtes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          {q.trim().length >= 2 && resultats.length === 0 && (
            <p className="ajout__rien">
              Rien trouvé pour « {q} ». Le catalogue ne couvre pas tout —
              choisis l’aliment le plus proche.
            </p>
          )}

          <ul className="ajout__liste">
            {resultats.map((a) => (
              <li key={a.slug}>
                <button
                  type="button"
                  className="ajout__item"
                  onClick={() => {
                    setChoisi(a);
                    // La portion usuelle est pré-remplie : c'est ce qui
                    // évite d'aller chercher une balance pour un yaourt.
                    setQuantite(String(Math.round(a.portion_g)));
                  }}
                >
                  <span className="ajout__item-nom">{a.nom}</span>
                  <span className="ajout__item-valeurs">
                    {Math.round(a.kcal)} kcal · {a.proteines_g} g prot. / 100 g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="ajout__reglage">
          <label className="ajout__quantite">
            <span>Quantité</span>
            <span className="ajout__quantite-boite">
              <input
                type="text"
                inputMode="decimal"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
              />
              <span className="ajout__unite">g</span>
            </span>
          </label>

          <p className="ajout__portion">
            Portion habituelle : {Math.round(choisi.portion_g)} g
          </p>

          <fieldset className="ajout__moments">
            <legend>Quand ?</legend>
            {MOMENTS.map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                className={`ajout__moment ${moment === cle ? 'ajout__moment--actif' : ''}`}
                aria-pressed={moment === cle}
                onClick={() => setMoment(cle)}
              >
                {libelle}
              </button>
            ))}
          </fieldset>

          {erreur && <p className="mesure__erreur">{erreur}</p>}

          <button
            type="button"
            className="ajout__valider"
            disabled={envoi}
            onClick={valider}
          >
            {envoi ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      )}
    </div>
  );
}

export default AjoutAliment;
