import { useEffect, useRef, useState } from 'react';
import { Check, Lock, Minus, Plus, Trophy, X } from 'lucide-react';

/* Le parcours, copié de l'onglet « Physique » de Taller : 16 niveaux de
   7 jours (112 jours), un rond par jour relié aux autres, un trophée au
   bout de chaque niveau. Un nouveau jour se débloque chaque jour : c'est
   la raison de revenir le lendemain.

   Où est gardée la progression : dans les cases cochées du serveur
   (task_completions, clé libre), sans rien changer au serveur.
   - `parcours-j<N>` coché à la date CARNET (fixe, hors de tout
     historique) : la liste de tous les jours faits, lue en un appel ;
   - la même clé cochée à la date du jour : « le jour d'aujourd'hui est
     fait », et la série du jour compte. */

export const CARNET_PARCOURS = '2000-01-01';
export const NB_NIVEAUX = 16;
export const JOURS_PAR_NIVEAU = 7;
export const NB_JOURS_PARCOURS = NB_NIVEAUX * JOURS_PAR_NIVEAU;
export const cleJourParcours = (n) => `parcours-j${n}`;
export const numeroJourParcours = (cle) => {
  const m = /^parcours-j(\d+)$/.exec(cle);
  return m ? Number(m[1]) : null;
};

/* ---------- Les exercices ---------- */

// Durées de base en secondes, pour le niveau 1. `fond` : la couleur du
// rond derrière l'emoji (une par famille, comme les dessins de Taller).
const FOND = {
  posture: '#3a2b5c',
  colonne: '#1f4a52',
  gainage: '#5a3418',
  sauts: '#5c2330',
  jambes: '#2c4a2a',
  equilibre: '#4a4220',
  calme: '#25324f',
};

const EXOS = {
  rotations: { nom: 'Rotations des épaules', emoji: '🔄', s: 30, f: 'posture', consigne: 'Fais de grands cercles avec les épaules vers l’arrière, lentement.' },
  mur: { nom: 'Dos au mur', emoji: '🧍', s: 45, f: 'posture', consigne: 'Talons, fesses, omoplates et tête contre le mur. Rentre le menton et grandis-toi, sans cambrer.' },
  menton: { nom: 'Rentrer le menton', emoji: '😌', s: 30, f: 'posture', consigne: 'Recule la tête comme pour faire un double menton, sans baisser les yeux. Tiens 2 s, relâche, recommence.' },
  cactus: { nom: 'Bras en cactus', emoji: '🌵', s: 40, f: 'posture', consigne: 'Dos au mur, coudes pliés à angle droit contre le mur. Monte les bras le long du mur, puis redescends lentement.' },
  epaules: { nom: 'Ouverture des épaules', emoji: '🤲', s: 40, f: 'posture', consigne: 'Mains jointes dans le dos, bras tendus. Ouvre la poitrine et recule les épaules.' },
  superman: { nom: 'Superman', emoji: '🦸', s: 30, f: 'posture', consigne: 'Allongé sur le ventre, lève en même temps les bras et les jambes tendus. Regarde le sol.' },
  cou: { nom: 'Étirement du cou', emoji: '🙇', s: 30, f: 'posture', consigne: 'Penche l’oreille vers l’épaule, sans lever l’épaule. Change de côté à la moitié.' },

  grandis: { nom: 'Grandis-toi', emoji: '🙌', s: 30, f: 'colonne', consigne: 'Debout, bras tendus au-dessus de la tête, monte sur la pointe des pieds et étire-toi vers le plafond.' },
  suspension: { nom: 'Suspension à la barre', emoji: '🧗', s: 30, f: 'colonne', consigne: 'Suspends-toi bras tendus, épaules relâchées, sans te balancer. Pas de barre ? Fais « Grandis-toi » à la place. Redescends en douceur.' },
  cobra: { nom: 'Cobra', emoji: '🐍', s: 30, f: 'colonne', consigne: 'Allongé sur le ventre, mains sous les épaules. Lève la poitrine en gardant le bassin au sol, sans forcer.' },
  chatvache: { nom: 'Chat-vache', emoji: '🐈', s: 40, f: 'colonne', consigne: 'À quatre pattes, arrondis le dos puis creuse-le, lentement, au rythme de ta respiration.' },
  torsion: { nom: 'Torsion allongée', emoji: '🌀', s: 40, f: 'colonne', consigne: 'Allongé sur le dos, ramène un genou de l’autre côté, épaules collées au sol. Change de côté à la moitié.' },
  flexion: { nom: 'Flexion avant', emoji: '🙆', s: 30, f: 'colonne', consigne: 'Debout, jambes tendues, descends doucement les mains vers les pieds. Laisse pendre la tête.' },
  chien: { nom: 'Chien tête en bas', emoji: '🐕', s: 30, f: 'colonne', consigne: 'Mains et pieds au sol, fesses vers le plafond : ton corps fait un V à l’envers. Pousse le sol avec les mains.' },

  planche: { nom: 'Planche', emoji: '🧱', s: 30, f: 'gainage', consigne: 'Sur les avant-bras, corps bien droit de la tête aux talons. Serre le ventre et respire.' },
  planchecote: { nom: 'Planche sur le côté', emoji: '📐', s: 30, f: 'gainage', consigne: 'Sur un avant-bras, corps droit, bassin levé. Change de côté à la moitié.' },
  pont: { nom: 'Pont fessier', emoji: '🌉', s: 30, f: 'gainage', consigne: 'Allongé sur le dos, genoux pliés. Monte le bassin jusqu’à aligner genoux, hanches et épaules, puis redescends.' },
  brasjambe: { nom: 'Bras et jambe opposés', emoji: '🐾', s: 40, f: 'gainage', consigne: 'À quatre pattes, tends le bras droit et la jambe gauche, tiens 2 s, puis change. Dos bien plat.' },
  insecte: { nom: 'Insecte mort', emoji: '🪲', s: 30, f: 'gainage', consigne: 'Sur le dos, bras vers le plafond, genoux pliés en l’air. Descends un bras et la jambe opposée sans décoller le bas du dos. Alterne.' },
  squat: { nom: 'Squat', emoji: '🪑', s: 30, f: 'gainage', consigne: 'Pieds écartés de la largeur des épaules, descends comme pour t’asseoir, dos droit, puis remonte.' },

  masai: { nom: 'Sauts Masaï', emoji: '🦘', s: 30, f: 'sauts', consigne: 'Sauts verticaux sur la pointe des pieds, jambes presque tendues, bras le long du corps. Atterris en douceur.' },
  genoux: { nom: 'Montées de genoux', emoji: '🏃', s: 30, f: 'sauts', consigne: 'Cours sur place en montant les genoux à hauteur des hanches.' },
  jacks: { nom: 'Jumping jacks', emoji: '⭐', s: 30, f: 'sauts', consigne: 'Saute en écartant bras et jambes, puis reviens pieds joints, bras le long du corps.' },
  corde: { nom: 'Corde à sauter', emoji: '🪢', s: 30, f: 'sauts', consigne: 'Avec ou sans corde : petits sauts rapides sur la pointe des pieds.' },
  pointes: { nom: 'Montées sur pointes', emoji: '👣', s: 30, f: 'sauts', consigne: 'Debout, monte sur la pointe des pieds, tiens 1 s, redescends lentement.' },

  fente: { nom: 'Fente basse', emoji: '🦵', s: 40, f: 'jambes', consigne: 'Un genou au sol, l’autre pied devant. Avance le bassin pour étirer l’avant de la hanche. Change de côté à la moitié.' },
  papillon: { nom: 'Papillon', emoji: '🦋', s: 40, f: 'jambes', consigne: 'Assis, plantes des pieds l’une contre l’autre. Laisse descendre les genoux, dos droit.' },
  pigeon: { nom: 'Pigeon', emoji: '🕊️', s: 40, f: 'jambes', consigne: 'Une jambe pliée devant toi, l’autre tendue derrière. Penche-toi doucement vers l’avant. Change de côté à la moitié.' },
  ischios: { nom: 'Jambe tendue au plafond', emoji: '🦿', s: 40, f: 'jambes', consigne: 'Allongé sur le dos, monte une jambe tendue et tiens-la derrière la cuisse. Change de côté à la moitié.' },
  cuisse: { nom: 'Étirement de la cuisse', emoji: '🧘', s: 40, f: 'jambes', consigne: 'Debout, attrape ton pied derrière toi, genoux serrés. Change de côté à la moitié.' },
  ecart: { nom: 'Jambes écartées au sol', emoji: '🤸', s: 30, f: 'jambes', consigne: 'Assis, jambes écartées et tendues, penche-toi vers l’avant en gardant le dos droit.' },

  unejambe: { nom: 'Équilibre sur une jambe', emoji: '🦩', s: 30, f: 'equilibre', consigne: 'Tiens sur une jambe en regardant droit devant. Change à la moitié. Trop facile ? Ferme les yeux.' },
  chevilles: { nom: 'Cercles de chevilles', emoji: '⭕', s: 30, f: 'equilibre', consigne: 'Pied levé, dessine de grands cercles avec la cheville, dans un sens puis dans l’autre. Change de pied à la moitié.' },
  marche: { nom: 'Marche sur la pointe', emoji: '🩰', s: 30, f: 'equilibre', consigne: 'Marche sur la pointe des pieds, le corps grandi, sans redescendre les talons.' },
  mollets: { nom: 'Mollets au mur', emoji: '🦶', s: 40, f: 'equilibre', consigne: 'Mains au mur, une jambe tendue derrière, talon au sol. Change de côté à la moitié.' },

  enfant: { nom: 'Posture de l’enfant', emoji: '🧎', s: 40, f: 'calme', consigne: 'À genoux, assis sur les talons, bras tendus devant toi, front vers le sol. Relâche tout le dos.' },
  respiration: { nom: 'Respiration lente', emoji: '🌬️', s: 30, f: 'calme', consigne: 'Inspire 4 secondes par le nez, souffle 6 secondes par la bouche. Relâche les épaules.' },
  repos: { nom: 'Repos', emoji: '😮‍💨', s: 15, f: 'calme', consigne: 'Respire calmement, secoue les jambes.', repos: true },
};

/* ---------- Les 7 jours d'un niveau ---------- */

// Un échauffement, une liste d'exercices (on en prend plus à chaque
// niveau, en tournant dans la liste), un retour au calme.
const JOURS_TYPE = [
  {
    theme: 'Posture',
    texte: 'Redresse ton dos et tes épaules : c’est ce qui te fait paraître plus grand, tout de suite.',
    debut: 'rotations', fin: 'enfant',
    exos: ['mur', 'menton', 'cactus', 'epaules', 'superman', 'cou', 'brasjambe', 'cobra'],
  },
  {
    theme: 'Colonne',
    texte: 'Décompresse et assouplis ta colonne pour te tenir à ta vraie hauteur.',
    debut: 'grandis', fin: 'respiration',
    exos: ['suspension', 'cobra', 'chatvache', 'torsion', 'flexion', 'chien', 'enfant', 'superman'],
  },
  {
    theme: 'Gainage',
    texte: 'Un ventre et un dos solides tiennent ta posture droite toute la journée, sans effort.',
    debut: 'jacks', fin: 'enfant',
    exos: ['planche', 'brasjambe', 'pont', 'insecte', 'planchecote', 'squat', 'superman', 'mur'],
  },
  {
    theme: 'Sauts',
    texte: 'Des sauts courts et dynamiques : les impacts rendent tes os plus solides.',
    debut: 'chevilles', fin: 'mollets',
    exos: ['masai', 'repos', 'genoux', 'corde', 'repos', 'pointes', 'jacks', 'repos', 'masai'],
  },
  {
    theme: 'Hanches et jambes',
    texte: 'Des hanches et des jambes souples, c’est un bassin bien placé et un dos droit.',
    debut: 'grandis', fin: 'respiration',
    exos: ['fente', 'papillon', 'pigeon', 'ischios', 'cuisse', 'ecart', 'flexion', 'chien'],
  },
  {
    theme: 'Équilibre et pieds',
    texte: 'Des chevilles et des pieds solides : la base de ta posture, de bas en haut.',
    debut: 'chevilles', fin: 'respiration',
    exos: ['unejambe', 'pointes', 'marche', 'mollets', 'mur', 'epaules', 'squat', 'cactus'],
  },
  {
    theme: 'Défi du niveau',
    texte: 'La séance qui reprend tout ton niveau. Termine-la pour gagner ton trophée.',
    debut: 'grandis', fin: 'enfant',
    exos: ['suspension', 'planche', 'masai', 'cobra', 'mur', 'pont', 'fente', 'repos', 'planchecote', 'pigeon'],
  },
];

const arrondi5 = (s) => Math.max(10, Math.round(s / 5) * 5);

export const niveauDuJour = (n) => Math.ceil(n / JOURS_PAR_NIVEAU);
export const jourDansNiveau = (n) => ((n - 1) % JOURS_PAR_NIVEAU) + 1;
// Piments de difficulté, comme Taller : 1 au niveau 1, 6 au niveau 16.
export const nbPiments = (niveau) => Math.min(6, Math.max(1, Math.ceil(niveau / 3)));
export const piments = (niveau) => '🌶️'.repeat(nbPiments(niveau));
// Le rond « 👀 » : un jour par niveau dont on ne voit le thème qu'en y arrivant.
export const jourSurprise = (niveau) => ((niveau * 3) % 6) + 1;

/** La séance du jour n du parcours (1 à 112). */
export function seanceDuParcours(n) {
  const niveau = niveauDuJour(n);
  const jour = jourDansNiveau(n);
  const type = JOURS_TYPE[jour - 1];
  const facteur = Math.min(2, 1 + 0.07 * (niveau - 1));
  // 6 exercices au niveau 1, jusqu’à 10 au défi des derniers niveaux ; la liste tourne d'un cran
  // par niveau pour que la séance ne soit jamais tout à fait la même.
  const combien = Math.min(type.exos.length, 5 + Math.ceil(niveau / 3) + (jour === 7 ? 1 : 0));
  const decalage = jour === 7 ? 0 : (niveau - 1) % type.exos.length;
  const choisis = [];
  for (let i = 0; choisis.length < combien && i < type.exos.length * 2; i++) {
    const id = type.exos[(decalage + i) % type.exos.length];
    // Pas deux repos de suite, pas de repos en premier ou en dernier.
    if (id === 'repos' && (choisis.length === 0 || choisis.length === combien - 1 || choisis[choisis.length - 1] === 'repos')) continue;
    if (id !== 'repos' && choisis.includes(id)) continue;
    choisis.push(id);
  }
  const ids = [type.debut, ...choisis, type.fin];
  const etapes = ids.map((id, i) => {
    const e = EXOS[id];
    // L'échauffement et le retour au calme s'allongent peu.
    const f = i === 0 || i === ids.length - 1 ? Math.min(1.3, facteur) : facteur;
    return { id: `${id}-${i}`, nom: e.nom, emoji: e.emoji, consigne: e.consigne, repos: !!e.repos, fond: FOND[e.f], s: e.repos ? e.s : arrondi5(e.s * f) };
  });
  const texte = n === 1
    ? 'Bienvenue au jour 1 de ton parcours. Chaque jour, la séance monte un peu en difficulté.'
    : type.texte;
  return { n, niveau, jour, theme: type.theme, texte, etapes };
}

export const dureeSecondes = (etapes) => etapes.reduce((t, e) => t + e.s, 0);
export const formatDuree = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`;
};
const formatMinSec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Où en est la personne : le prochain jour à faire et s'il est ouvert aujourd'hui. */
export function etatParcours(joursFaits, aujourdhuiFait) {
  let prochain = 1;
  while (joursFaits.has(prochain) && prochain <= NB_JOURS_PARCOURS) prochain++;
  const fini = prochain > NB_JOURS_PARCOURS;
  return { prochain: fini ? NB_JOURS_PARCOURS : prochain, ouvert: !fini && !aujourdhuiFait, fini, faits: joursFaits.size };
}

/* ---------- La fiche d'une séance (avant de commencer) ---------- */

export function FicheSeance({ n, faite, ouverte, onFermer, onCommencer }) {
  const seance = seanceDuParcours(n);
  const [durees, setDurees] = useState(() => seance.etapes.map((e) => e.s));
  const [detail, setDetail] = useState(null);
  const total = durees.reduce((t, s) => t + s, 0);
  const regler = (i, delta) => setDurees((d) => d.map((s, j) => (j === i ? Math.min(180, Math.max(10, s + delta)) : s)));

  // Échap ferme, comme la croix.
  useEffect(() => {
    const touche = (e) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  return (
    <div className="fiche" role="dialog" aria-modal="true" aria-label={`Jour ${seance.jour}, niveau ${seance.niveau}`}>
      <div className="fiche-haut">
        <button type="button" className="fiche-fermer" onClick={onFermer} aria-label="Fermer">
          <X size={22} aria-hidden="true" />
        </button>
        <h2 className="fiche-titre">Jour {seance.jour}</h2>
        <span className="fiche-niveau">Niv. {seance.niveau}</span>
      </div>
      <div className="fiche-defile">
        <p className="fiche-meta">{formatDuree(total).toUpperCase()} · {seance.theme.toUpperCase()}</p>
        <p className="fiche-texte">{seance.texte}</p>
        <ul className="fiche-liste">
          {seance.etapes.map((e, i) => (
            <li key={e.id} className="fiche-ligne">
              <button type="button" className="fiche-exo" onClick={() => setDetail(detail === i ? null : i)} aria-expanded={detail === i}>
                <span className="fiche-rond" style={{ background: e.fond }} aria-hidden="true">{e.emoji}</span>
                <span className="fiche-nom">{e.nom}</span>
              </button>
              <span className="fiche-reglage">
                <button type="button" onClick={() => regler(i, -15)} aria-label={`Moins de temps pour ${e.nom}`}><Minus size={16} aria-hidden="true" /></button>
                <span className="fiche-temps">{formatMinSec(durees[i])}</span>
                <button type="button" onClick={() => regler(i, 15)} aria-label={`Plus de temps pour ${e.nom}`}><Plus size={16} aria-hidden="true" /></button>
              </span>
              {detail === i && <p className="fiche-consigne">{e.consigne}</p>}
            </li>
          ))}
        </ul>
      </div>
      <div className="fiche-bas">
        {ouverte || faite ? (
          <button type="button" className="funnel-cta fiche-go" onClick={() => onCommencer(seance.etapes.map((e, i) => ({ ...e, s: durees[i] })))}>
            {faite ? 'Refaire la séance' : 'Commencer'}
          </button>
        ) : (
          <p className="fiche-ferme"><Lock size={16} aria-hidden="true" /> Ce jour se débloque demain.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- L'écran du parcours ---------- */

// Un niveau : 4 ronds de gauche à droite, on descend à droite, puis
// 3 ronds de droite à gauche et le trophée en bas à gauche.
const PLACES = [
  { ligne: 1, col: 1 }, { ligne: 1, col: 2 }, { ligne: 1, col: 3 }, { ligne: 1, col: 4 },
  { ligne: 2, col: 4 }, { ligne: 2, col: 3 }, { ligne: 2, col: 2 },
];

// Les traits entre deux ronds (de → a, 7 = le trophée) : orange quand les
// deux bouts sont faits. Les centres des colonnes sont à 12,5 %, 37,5 %…
const centre = (col) => `${(2 * col - 1) * 12.5}%`;
const TRAITS = [
  ...[1, 2, 3].map((col) => ({ de: col - 1, a: col, style: { left: centre(col), width: '25%', top: 'calc(var(--rond) / 2 - 5px)', height: 10 } })),
  { de: 3, a: 4, style: { left: 'calc(87.5% - 5px)', width: 10, top: 'calc(var(--rond) / 2)', height: 'calc(var(--rond) + var(--ecart))' } },
  ...[3, 2, 1].map((col, k) => ({ de: 4 + k, a: 5 + k, style: { left: centre(col), width: '25%', top: 'calc(var(--rond) * 1.5 + var(--ecart) - 5px)', height: 10 } })),
];

export function Parcours({ joursFaits, aujourdhuiFait, onOuvrirJour }) {
  const { prochain, ouvert, fini, faits } = etatParcours(joursFaits, aujourdhuiFait);
  const niveauCourant = niveauDuJour(prochain);
  const restants = NB_JOURS_PARCOURS - faits;
  const refCourant = useRef(null);

  // À l'ouverture, on amène le niveau en cours à l'écran.
  useEffect(() => {
    if (niveauCourant > 1) refCourant.current?.scrollIntoView({ block: 'center' });
  }, [niveauCourant]);

  return (
    <div className="parcours">
      <div className="parcours-hero">
        <span className="parcours-hero-chiffre">{restants}</span>
        <span className="parcours-hero-libelle">{restants > 1 ? 'jours restants' : restants === 1 ? 'jour restant' : 'Parcours terminé 🏆'}</span>
        <span className="parcours-hero-barre" aria-hidden="true"><span style={{ width: `${(faits / NB_JOURS_PARCOURS) * 100}%` }} /></span>
        <span className="parcours-hero-pct">Progression {Math.round((faits / NB_JOURS_PARCOURS) * 100)} %</span>
      </div>

      {Array.from({ length: NB_NIVEAUX }, (_, k) => k + 1).map((niveau) => {
        const premier = (niveau - 1) * JOURS_PAR_NIVEAU + 1;
        const nbFaits = Array.from({ length: JOURS_PAR_NIVEAU }, (_, j) => premier + j).filter((n) => joursFaits.has(n)).length;
        const gagne = nbFaits === JOURS_PAR_NIVEAU;
        return (
          <section key={niveau} className={`parcours-niveau ${niveau > niveauCourant ? 'a-venir' : ''}`} ref={niveau === niveauCourant ? refCourant : undefined} aria-label={`Niveau ${niveau}`}>
            <div className="parcours-niveau-tete">
              <h3>Niveau {niveau} <span aria-label={`difficulté ${nbPiments(niveau)} sur 6`}>{piments(niveau)}</span></h3>
              <span className="parcours-compte">{nbFaits}/{JOURS_PAR_NIVEAU}</span>
            </div>
            <span className="parcours-barre" aria-hidden="true"><span style={{ width: `${(nbFaits / JOURS_PAR_NIVEAU) * 100}%` }} /></span>

            <div className="parcours-chemin">
              {TRAITS.map(({ de, a, style }) => {
                const allume = joursFaits.has(premier + de) && (a === 7 ? gagne : joursFaits.has(premier + a));
                return <span key={de} className={`parcours-trait ${allume ? 'fait' : ''}`} style={style} aria-hidden="true" />;
              })}
              {PLACES.map(({ ligne, col }, j) => {
                const n = premier + j;
                const fait = joursFaits.has(n);
                const courant = !fini && n === prochain;
                const surprise = !fait && !(courant && ouvert) && j + 1 === jourSurprise(niveau);
                const etat = fait ? 'fait' : courant ? (ouvert ? 'courant' : 'demain') : 'ferme';
                const libelle = fait
                  ? `Jour ${j + 1}, fait. Le refaire`
                  : courant ? (ouvert ? `Jour ${j + 1}, à faire aujourd’hui` : `Jour ${j + 1}, se débloque demain`) : `Jour ${j + 1}, pas encore débloqué`;
                return (
                  <button
                    key={n}
                    type="button"
                    className={`parcours-rond ${etat}`}
                    style={{ gridRow: ligne, gridColumn: col }}
                    onClick={() => onOuvrirJour(n)}
                    disabled={etat === 'ferme'}
                    aria-label={libelle}
                    aria-current={courant ? 'step' : undefined}
                  >
                    {fait ? <Check size={22} strokeWidth={3} aria-hidden="true" /> : surprise ? <span aria-hidden="true">👀</span> : `Jour ${j + 1}`}
                  </button>
                );
              })}
              <span className={`parcours-rond parcours-trophee ${gagne ? 'gagne' : ''}`} style={{ gridRow: 2, gridColumn: 1 }} aria-label={gagne ? 'Trophée gagné' : 'Trophée du niveau'}>
                <Trophy size={24} aria-hidden="true" />
              </span>
            </div>
          </section>
        );
      })}
      <p className="parcours-suite">D’autres niveaux arrivent bientôt 💪</p>
    </div>
  );
}
