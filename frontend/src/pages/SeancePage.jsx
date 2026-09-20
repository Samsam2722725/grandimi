import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Pause, Play, SkipForward } from 'lucide-react';

/* L'écran d'entraînement : un exercice à la fois, un minuteur, rien
   d'autre.

   Un seul exercice affiché, pas la liste. Pendant une séance, on est par
   terre avec le téléphone posé à côté : le seul texte lisible est celui
   qu'on peut prendre d'un coup d'œil en tenant une position. Une liste
   défilante oblige à chercher où l'on en est. */

function mmss(secondes) {
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* Le libellé humain des catégories.

   La colonne `categorie` porte une valeur technique contrainte
   ('decompression', 'posture', …) : c'est une clé, pas un texte. Affichée
   telle quelle, elle donnait « DECOMPRESSION » sans accent au milieu d'un
   écran en français — une valeur de base de données montrée à
   l'utilisateur. La table reste la source de vérité ; c'est ici qu'on la
   traduit. */
const LIBELLE_CATEGORIE = {
  decompression: 'Décompression',
  posture: 'Posture',
  mobilite: 'Mobilité',
  renforcement: 'Renforcement',
};

const RAYON = 52;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

/* Le minuteur est un composant à part, REMONTÉ à chaque exercice par sa
   `key`.

   La première version gardait le temps restant dans l'écran parent et le
   remettait à la bonne valeur depuis un effet, à chaque changement
   d'exercice. Cela fonctionne, mais fait peindre une fois l'ancienne
   durée avant de la corriger, et c'est précisément le motif que React
   décourage. Une `key` qui change détruit le composant et en monte un
   neuf : l'état part de la bonne valeur du premier rendu, sans effet de
   remise à zéro. */
function Minuteur({ secondes, enPause, onFini }) {
  const [restant, setRestant] = useState(secondes);

  useEffect(() => {
    if (enPause) return undefined;
    const t = setInterval(() => setRestant((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [enPause]);

  /* La fin est signalée au parent depuis un effet, jamais depuis le
     battement : appelée dans l'intervalle, la remontée se ferait pendant
     une mise à jour d'état, et deux battements tombant dans le même
     cycle de rendu pouvaient faire sauter un exercice. */
  useEffect(() => {
    if (restant <= 0) onFini();
  }, [restant, onFini]);

  const fraction = secondes ? 1 - restant / secondes : 0;

  return (
    <>
      {/* `aria-hidden` sur l'anneau : le temps restant est déjà porté par
          la zone `role="timer"` juste en dessous. */}
      <div className="seance__minuteur" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <circle className="seance__rail" cx="60" cy="60" r={RAYON} fill="none" strokeWidth="8" />
          <circle
            className="seance__arc"
            cx="60"
            cy="60"
            r={RAYON}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            strokeDasharray={`${fraction * CIRCONFERENCE} ${CIRCONFERENCE}`}
          />
        </svg>
        <span className="seance__chiffre">{mmss(restant)}</span>
      </div>

      {/* `aria-live="off"` : un compteur qui s'annonce à chaque seconde
          rend un lecteur d'écran inutilisable. Le rôle `timer` suffit à
          le rendre consultable à la demande. */}
      <p className="sr-only" role="timer" aria-live="off">
        {mmss(restant)} restantes
      </p>
    </>
  );
}

function SeancePage({ exercices = [], onTermine, onQuitter }) {
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);

  /* Les exercices déjà passés vivent dans une ref, pas dans un état.

     Ils ne s'affichent nulle part pendant la séance : les mettre dans un
     état déclencherait un rendu complet à chaque exercice terminé, au
     moment précis où le minuteur doit rester régulier. */
  const faits = useRef([]);
  const exercice = exercices[index];

  if (!exercice) return null;

  const avancer = (compteCommeFait) => {
    if (compteCommeFait) faits.current.push(exercice.slug);
    if (index + 1 < exercices.length) {
      setIndex((i) => i + 1);
      setEnPause(false);
    } else {
      onTermine?.(faits.current);
    }
  };

  return (
    <div className="seance" role="dialog" aria-modal="true" aria-label="Entraînement">
      <header className="seance__entete">
        <button
          type="button"
          className="seance__retour"
          onClick={onQuitter}
          aria-label="Quitter l'entraînement"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <span className="seance__pas">
          {index + 1} / {exercices.length}
        </span>
      </header>

      <section className="seance__corps">
        <p className="seance__categorie">
          {LIBELLE_CATEGORIE[exercice.categorie] || exercice.categorie}
        </p>
        <h2 className="seance__nom">{exercice.nom}</h2>

        <Minuteur
          key={exercice.slug}
          secondes={exercice.duree_sec}
          enPause={enPause}
          onFini={() => avancer(true)}
        />

        <p className="seance__consigne">{exercice.consigne}</p>
      </section>

      <div className="seance__commandes">
        <button
          type="button"
          className="seance__bouton"
          onClick={() => setEnPause((p) => !p)}
        >
          {enPause ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
          {enPause ? 'Reprendre' : 'Pause'}
        </button>

        {/* Un exercice PASSÉ n'est pas un exercice fait. Le compter quand
            même gonflerait la progression avec ce que l'utilisateur vient
            explicitement de refuser, et rendrait le pourcentage inutile. */}
        <button type="button" className="seance__bouton" onClick={() => avancer(false)}>
          <SkipForward size={20} aria-hidden="true" />
          Passer
        </button>

        <button
          type="button"
          className="seance__bouton seance__bouton--valide"
          onClick={() => avancer(true)}
        >
          <Check size={20} aria-hidden="true" />
          Fait
        </button>
      </div>
    </div>
  );
}

export default SeancePage;
