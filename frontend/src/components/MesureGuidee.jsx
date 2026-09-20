import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, TriangleAlert } from 'lucide-react';
import apiClient from '../lib/api';

/* L'écran de mesure guidée.

   C'est la pièce qui décide de la valeur de tout le reste. Un stadiomètre
   clinique a un écart-type de 0,2 à 0,3 cm ; une mesure faite au mur avec
   un livre sur la tête est facilement à 1 cm près. Sur six mois
   d'intervalle, 1 cm d'erreur donne près de 3 cm/an d'erreur sur la
   vitesse de croissance — or la vitesse est le seul signal qui vaille
   quelque chose dans cette application.

   D'où un écran entier pour un seul nombre. */

const ETAPES = [
  {
    titre: 'Au réveil, pas le soir',
    texte:
      'On perd 1 à 1,5 cm dans la journée : les disques de la colonne se tassent sous le poids du corps. Mesure-toi dans l’heure qui suit le lever, toujours au même moment.',
  },
  {
    titre: 'Pieds nus, dos au mur',
    texte:
      'Talons joints contre la plinthe. Talons, fesses et omoplates touchent le mur en même temps.',
  },
  {
    titre: 'Regard droit devant',
    texte:
      'Le bas de l’orbite et le haut du conduit auditif sur la même ligne horizontale. Menton ni levé ni rentré : c’est l’erreur qui coûte le plus de millimètres.',
  },
  {
    titre: 'Inspire et retiens',
    texte:
      'Prends une grande inspiration et garde-la pendant qu’on pose la règle à plat sur ta tête, bien horizontale.',
  },
];

/* Trois mesures, et surtout TROIS SAISIES INDÉPENDANTES.

   Les champs 2 et 3 ne sont volontairement pas pré-remplis avec le
   premier relevé. Ce serait plus rapide, et ce serait exactement ce qui
   rend la mesure inutile : voir « 172,4 » déjà inscrit fait accepter
   172,4, qu'on ait relu le mètre ou non. On mesurerait alors la première
   valeur trois fois au lieu de mesurer trois fois. */
const NB_MESURES = 3;

function MesureGuidee({ onFerme, onEnregistre }) {
  const [etape, setEtape] = useState(0); // 0..3 = protocole, 4 = saisie
  const [valeurs, setValeurs] = useState(Array(NB_MESURES).fill(''));
  const [moment, setMoment] = useState('matin');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const premierChamp = useRef(null);

  const enSaisie = etape >= ETAPES.length;

  useEffect(() => {
    if (enSaisie) premierChamp.current?.focus();
  }, [enSaisie]);

  const nombres = valeurs
    .map((v) => Number.parseFloat(String(v).replace(',', '.')))
    .filter((n) => Number.isFinite(n));

  const complet = nombres.length === NB_MESURES;
  const etendue = complet ? Math.max(...nombres) - Math.min(...nombres) : 0;
  const disperse = complet && etendue > 1;

  /* La médiane, calculée sur l'indice du milieu plutôt qu'écrite en dur
     à 1. Avec NB_MESURES à 3 cela revient au même aujourd'hui ; écrit
     `[1]`, cela renverrait silencieusement la deuxième valeur le jour où
     l'on passera à cinq relevés. C'est le serveur qui fait foi de toute
     façon — cet affichage ne sert qu'à montrer ce qui sera retenu. */
  const mediane = complet
    ? [...nombres].sort((a, b) => a - b)[Math.floor(NB_MESURES / 2)]
    : null;

  /* Séparateur décimal français.

     `toFixed` rend toujours un point — « 1.5 cm » — et c'est exactement
     le genre de détail non traduit que le concurrent laisse traîner sur
     six chaînes de son application française. `toLocaleString('fr-FR')`
     ferait le travail, mais dépend de la locale réellement embarquée par
     le navigateur : sur un appareil qui ne l'a pas, il retombe
     silencieusement sur le point. Une substitution ne peut pas échouer. */
  const cm = (n) => n.toFixed(1).replace('.', ',');

  const changer = (i, v) => {
    setErreur(null);
    setValeurs((prev) => {
      const suivant = [...prev];
      suivant[i] = v;
      return suivant;
    });
  };

  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await apiClient.ajouterMesure({ mesures: nombres, moment });
      onEnregistre?.(res);
    } catch (e) {
      /* Le serveur distingue « tu as mal saisi » (400), « reviens dans
         trois jours » (409) et « recommence la séance » (422). Les
         fondre en un seul « une erreur est survenue » perdrait la seule
         information utile : quoi faire maintenant. */
      setErreur(e.details?.detail || e.message || 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mesure" role="dialog" aria-modal="true" aria-label="Mesurer ma taille">
      <header className="mesure__entete">
        <button
          type="button"
          className="mesure__retour"
          onClick={() => (etape === 0 ? onFerme() : setEtape((e) => e - 1))}
          aria-label="Revenir"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <span className="mesure__pas">
          {Math.min(etape + 1, ETAPES.length + 1)} / {ETAPES.length + 1}
        </span>
      </header>

      {!enSaisie ? (
        <section className="mesure__corps">
          <p className="mesure__numero">{etape + 1}</p>
          <h2 className="mesure__titre">{ETAPES[etape].titre}</h2>
          <p className="mesure__texte">{ETAPES[etape].texte}</p>
          <button
            type="button"
            className="mesure__principal"
            onClick={() => setEtape((e) => e + 1)}
          >
            {etape === ETAPES.length - 1 ? 'Je suis prêt' : 'Suivant'}
          </button>
        </section>
      ) : (
        <section className="mesure__corps">
          <h2 className="mesure__titre">Mesure-toi trois fois</h2>
          <p className="mesure__texte">
            Redescends et remonte entre chaque mesure. Trois relevés qui se
            ressemblent, c’est une mesure fiable ; trois relevés qui
            s’écartent, c’est du bruit.
          </p>

          <div className="mesure__champs">
            {valeurs.map((v, i) => (
              <label key={i} className="mesure__champ">
                <span className="mesure__champ-nom">Mesure {i + 1}</span>
                <span className="mesure__champ-boite">
                  <input
                    ref={i === 0 ? premierChamp : null}
                    type="text"
                    /* `decimal` et non `numeric` : ouvre le pavé avec la
                       virgule sur iOS, sans quoi on ne peut pas taper
                       172,4 sur un clavier français. */
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="—"
                    value={v}
                    onChange={(e) => changer(i, e.target.value)}
                  />
                  <span className="mesure__unite">cm</span>
                </span>
              </label>
            ))}
          </div>

          <fieldset className="mesure__moment">
            <legend>Moment de la mesure</legend>
            {[
              ['matin', 'Au réveil'],
              ['soir', 'Plus tard'],
            ].map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                className={`mesure__choix ${moment === cle ? 'mesure__choix--actif' : ''}`}
                aria-pressed={moment === cle}
                onClick={() => setMoment(cle)}
              >
                {libelle}
              </button>
            ))}
          </fieldset>

          {/* Le retour immédiat sur la dispersion, AVANT l'envoi.
              Découvrir après coup que la séance est refusée oblige à tout
              retaper ; le dire pendant la saisie laisse corriger celle
              qu'on sait douteuse. */}
          {/* Le texte est enveloppé dans UN span, et ce n'est pas
              cosmétique : le conteneur est en `display: flex` avec un
              `gap`, et chaque nœud de texte y devient un élément flex à
              part entière. Écrit sans ce span, « 172,4 cm », le
              `<strong>` et le point final formaient trois éléments
              séparés par 8 px — la phrase s'affichait « on retient
              172,4 cm . ». */}
          {complet && (
            <p className={`mesure__verdict ${disperse ? 'mesure__verdict--alerte' : ''}`}>
              {disperse ? (
                <>
                  <TriangleAlert size={16} aria-hidden="true" />
                  <span>
                    {cm(etendue)} cm d’écart entre tes relevés. Reprends celui
                    qui te paraît le moins sûr.
                  </span>
                </>
              ) : (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>
                    Écart de {cm(etendue)} cm — on retient{' '}
                    <strong>{cm(mediane)} cm</strong>.
                  </span>
                </>
              )}
            </p>
          )}

          {erreur && <p className="mesure__erreur">{erreur}</p>}

          <button
            type="button"
            className="mesure__principal"
            disabled={!complet || disperse || envoi}
            onClick={envoyer}
          >
            {envoi ? 'Enregistrement…' : 'Enregistrer ma mesure'}
          </button>
        </section>
      )}
    </div>
  );
}

export default MesureGuidee;
