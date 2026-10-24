import { useEffect, useRef, useState } from 'react';
import { Check, Lock, Minus, Plus, Trophy, X } from 'lucide-react';

/* Le parcours, copié de Taller (onglets « Physique » et « Train ») :
   - 16 niveaux de 7 jours, un rond par jour relié aux autres, un trophée au
     bout de chaque niveau ; un nouveau jour se débloque chaque jour ;
   - la bibliothèque de séances libres par zone, reprise de leurs séances.

   On n'a vu que le jour 1 de Taller (compte gratuit) : il est repris tel
   quel. Les jours suivants suivent ses règles : tout le corps chaque jour,
   2 ou 3 exercices qui changent, des temps qui montent par paliers de
   15 s, des sauts deux fois par semaine, un défi au 7ᵉ jour.

   Ce qui est à lui : les réponses du questionnaire (voûté, sport,
   sommeil) et deux réglages (temps par jour, douleur) changent la séance,
   et la fiche dit pourquoi.

   Où est gardée la progression : dans les cases cochées du serveur
   (task_completions, clé libre), sans rien changer au serveur.
   - `parcours-j<N>` et `pref-<réglage>-<valeur>` cochés à la date CARNET
     (fixe, hors de tout historique) : lus en un seul appel ;
   - `parcours-j<N>` coché aussi à la date du jour : « le jour d'aujourd'hui
     est fait », et la série compte. */

export const CARNET_PARCOURS = '2000-01-01';
export const NB_NIVEAUX = 16;
export const JOURS_PAR_NIVEAU = 7;
export const NB_JOURS_PARCOURS = NB_NIVEAUX * JOURS_PAR_NIVEAU;
export const cleJourParcours = (n) => `parcours-j${n}`;
export const numeroJourParcours = (cle) => {
  const m = /^parcours-j(\d+)$/.exec(cle);
  return m ? Number(m[1]) : null;
};
export const cleLibre = (id) => `libre-${id}`;

/* ---------- Les réglages (2 questions, posées une fois) ---------- */

export const REGLAGES = {
  temps: { question: 'Combien de temps as-tu par jour ?', choix: [['5', '5 min'], ['10', '10 min'], ['15', '15 min ou plus']], defaut: '10' },
  douleur: { question: 'Une douleur en ce moment ?', choix: [['aucune', 'Aucune'], ['dos', 'Au dos'], ['genoux', 'Aux genoux']], defaut: 'aucune' },
};
export const clePref = (groupe, valeur) => `pref-${groupe}-${valeur}`;
export function lirePrefs(cles) {
  const prefs = {};
  for (const cle of cles) {
    const m = /^pref-(temps|douleur|regime)-([\w-]+)$/.exec(cle);
    if (m) prefs[m[1]] = m[2];
  }
  return prefs;
}

/** Ce qui adapte le parcours à lui, tiré du questionnaire et des réglages. */
export function profilParcours(prediction = {}, prefs = {}) {
  const h = prediction.habitudes || {};
  const sommeil = Number(prediction.sleep_hours_per_night);
  return {
    voute: h.posture === 'voute' || h.posture === 'un-peu-voute' || h.assis === 'plus-8h',
    sport: h.exercice_freq === '0-2' ? 'doux' : h.exercice_freq === '6+' ? 'sportif' : 'normal',
    sommeilFaible: (sommeil > 0 && sommeil < 8) || h.coucher === 'apres-minuit' || h.telephone === 'tous-les-soirs',
    temps: prefs.temps || REGLAGES.temps.defaut,
    douleur: prefs.douleur || REGLAGES.douleur.defaut,
  };
}

/* ---------- Les exercices (noms et durées de Taller, explications à nous) ---------- */

const FOND = {
  colonne: '#1f4a52',
  hanches: '#5a3418',
  jambes: '#2c4a2a',
  haut: '#3a2b5c',
  equilibre: '#4a4220',
  sauts: '#5c2330',
  calme: '#25324f',
};

// s : durée de base en secondes (celle de Taller). z : la zone (couleur).
// sans : les douleurs pour lesquelles on le retire.
const EXOS = {
  // Colonne et dos
  'torsion-assise': { nom: 'Torsion assise', emoji: '🌀', s: 60, z: 'colonne', consigne: 'Assis, une jambe pliée par-dessus l’autre. Tourne le buste vers le genou plié, dos bien droit. Change de côté à la moitié.' },
  cobra: { nom: 'Cobra', emoji: '🐍', s: 30, z: 'colonne', sans: ['dos'], consigne: 'Sur le ventre, mains sous les épaules. Lève la poitrine en gardant le bassin au sol, sans forcer.' },
  'fil-aiguille': { nom: 'Fil de l’aiguille', emoji: '🧵', s: 60, z: 'colonne', consigne: 'À quatre pattes, glisse un bras sous l’autre jusqu’à poser l’épaule et la tempe au sol. Change de côté à la moitié.' },
  chiot: { nom: 'Posture du chiot', emoji: '🐶', s: 30, z: 'colonne', consigne: 'À quatre pattes, avance les mains loin devant et descends la poitrine vers le sol, fesses en l’air.' },
  chameau: { nom: 'Chameau', emoji: '🐪', s: 30, z: 'colonne', sans: ['dos', 'genoux'], consigne: 'À genoux, mains sur le bas du dos. Pousse le bassin vers l’avant et ouvre la poitrine vers le plafond, doucement.' },
  'torsion-allongee': { nom: 'Torsion allongée', emoji: '🔄', s: 60, z: 'colonne', consigne: 'Sur le dos, ramène un genou de l’autre côté, épaules collées au sol. Change de côté à la moitié.' },
  chien: { nom: 'Chien tête en bas', emoji: '🐕', s: 30, z: 'colonne', consigne: 'Mains et pieds au sol, fesses vers le plafond : ton corps fait un V à l’envers. Pousse le sol avec les mains.' },
  poupee: { nom: 'Poupée de chiffon', emoji: '🪆', s: 30, z: 'colonne', consigne: 'Debout, genoux un peu fléchis, laisse pendre le haut du corps vers le sol, bras relâchés. Balance-toi doucement.' },
  'flexion-avant': { nom: 'Flexion avant', emoji: '🙇', s: 30, z: 'colonne', consigne: 'Debout, jambes tendues, descends doucement le buste vers le sol et laisse pendre la tête et les bras.' },
  salut: { nom: 'Salut vers le haut', emoji: '🙌', s: 30, z: 'colonne', consigne: 'Debout, bras tendus au-dessus de la tête, paumes jointes. Étire-toi vers le plafond.' },
  'bascule-bassin': { nom: 'Bascule du bassin', emoji: '↕️', s: 30, z: 'colonne', consigne: 'Sur le dos, genoux pliés. Colle le bas du dos au sol en serrant le ventre, tiens 2 s, relâche. Recommence.' },

  // Hanches
  pigeon: { nom: 'Pigeon', emoji: '🕊️', s: 60, z: 'hanches', sans: ['genoux'], consigne: 'Une jambe pliée devant toi, l’autre tendue derrière. Penche-toi doucement vers l’avant. Change de côté à la moitié.' },
  'double-pigeon': { nom: 'Double pigeon', emoji: '🪷', s: 60, z: 'hanches', sans: ['genoux'], consigne: 'Assis, un tibia posé sur l’autre, les genoux l’un au-dessus de l’autre. Penche-toi en avant, dos long. Change à la moitié.' },
  lezard: { nom: 'Lézard', emoji: '🦎', s: 60, z: 'hanches', sans: ['genoux'], consigne: 'En fente basse, les deux mains au sol à l’intérieur du pied avant. Laisse descendre les hanches. Change à la moitié.' },
  '90-90': { nom: '90/90', emoji: '📐', s: 60, z: 'hanches', consigne: 'Assis, une jambe devant et une sur le côté, genoux pliés à angle droit. Penche-toi sur la jambe de devant. Change à la moitié.' },
  'figure-quatre': { nom: 'Figure 4 allongé', emoji: '4️⃣', s: 60, z: 'hanches', consigne: 'Sur le dos, pose une cheville sur le genou opposé et tire la cuisse vers toi. Change de côté à la moitié.' },
  'quadri-genou': { nom: 'Quadriceps à genou', emoji: '🧎', s: 60, z: 'hanches', sans: ['genoux'], consigne: 'Un genou au sol, attrape le pied arrière et rapproche-le des fesses, buste droit. Change à la moitié.' },
  'jambes-ecartees': { nom: 'Flexion jambes écartées', emoji: '🔺', s: 30, z: 'hanches', consigne: 'Debout, jambes très écartées, descends les mains vers le sol en gardant le dos long.' },
  'squat-profond': { nom: 'Squat profond', emoji: '🪑', s: 30, z: 'hanches', sans: ['genoux'], consigne: 'Descends en squat le plus bas possible, talons au sol, les coudes poussent les genoux vers l’extérieur.' },
  'fente-laterale': { nom: 'Fente latérale', emoji: '↔️', s: 60, z: 'hanches', sans: ['genoux'], consigne: 'Jambes écartées, plie un genou et descends sur le côté, l’autre jambe tendue. Alterne les côtés.' },

  // Jambes
  'mollet-mur': { nom: 'Mollet au mur', emoji: '🦶', s: 60, z: 'jambes', consigne: 'Mains au mur, une jambe tendue derrière, talon au sol. Change de côté à la moitié.' },
  orteils: { nom: 'Toucher les orteils', emoji: '👇', s: 30, z: 'jambes', consigne: 'Debout, jambes tendues, descends toucher tes orteils (ou tes tibias). Ne force pas.' },
  'jambes-croisees': { nom: 'Flexion jambes croisées', emoji: '🥨', s: 60, z: 'jambes', consigne: 'Debout, jambes croisées, penche-toi vers le sol. Change la jambe de devant à la moitié.' },
  hurdler: { nom: 'Hurdler', emoji: '🏁', s: 60, z: 'jambes', sans: ['genoux'], consigne: 'Assis, une jambe tendue, l’autre pied contre la cuisse. Penche-toi vers le pied tendu. Change à la moitié.' },
  'flexion-assise': { nom: 'Flexion assise', emoji: '🙏', s: 30, z: 'jambes', consigne: 'Assis, jambes tendues, attrape tes pieds ou tes tibias en gardant le dos long.' },
  'ecart-assis': { nom: 'Écart assis', emoji: '🤸', s: 30, z: 'jambes', consigne: 'Assis, jambes écartées et tendues, penche-toi vers l’avant, dos droit.' },
  'ischios-allonge': { nom: 'Ischios allongé', emoji: '🦿', s: 60, z: 'jambes', consigne: 'Sur le dos, monte une jambe tendue et tiens-la derrière la cuisse. Change de côté à la moitié.' },
  'quadri-debout': { nom: 'Quadriceps debout', emoji: '🧍', s: 60, z: 'jambes', consigne: 'Debout, attrape ton pied derrière toi, genoux serrés. Tiens-toi au mur si besoin. Change à la moitié.' },
  'quadri-cote': { nom: 'Quadriceps sur le côté', emoji: '🛌', s: 60, z: 'jambes', consigne: 'Allongé sur le côté, attrape le pied du dessus et ramène-le vers les fesses. Change de côté à la moitié.' },
  'fente-arriere': { nom: 'Fente arrière', emoji: '🦵', s: 60, z: 'jambes', sans: ['genoux'], consigne: 'Recule une jambe et descends le genou arrière près du sol, buste droit. Alterne les jambes.' },
  'fente-avant': { nom: 'Fente avant', emoji: '🚶', s: 60, z: 'jambes', sans: ['genoux'], consigne: 'Un grand pas en avant, descends le genou arrière vers le sol, buste droit. Alterne les jambes.' },

  // Haut du corps, épaules, cou
  triceps: { nom: 'Triceps au-dessus de la tête', emoji: '💪', s: 30, z: 'haut', consigne: 'Un bras plié derrière la tête, l’autre main tire doucement le coude. Change de côté à la moitié.' },
  cactus: { nom: 'Bras en cactus', emoji: '🌵', s: 30, z: 'haut', consigne: 'Coudes pliés à angle droit à hauteur d’épaules. Recule les coudes et serre les omoplates, puis relâche.' },
  'ouverture-poitrine': { nom: 'Ouverture de la poitrine', emoji: '🫶', s: 30, z: 'haut', consigne: 'Mains derrière la tête, coudes bien ouverts. Pousse la poitrine en avant.' },
  'bras-croise': { nom: 'Bras croisé', emoji: '🤗', s: 30, z: 'haut', consigne: 'Ramène un bras tendu contre la poitrine avec l’autre main. Change de côté à la moitié.' },
  'bras-mur': { nom: 'Bras au mur', emoji: '🧱', s: 30, z: 'haut', consigne: 'De profil contre un mur, main à plat à hauteur d’épaule. Tourne doucement le corps de l’autre côté. Change à la moitié.' },
  'pecs-mur': { nom: 'Pectoraux au mur', emoji: '🚪', s: 30, z: 'haut', consigne: 'Avant-bras contre un mur ou un cadre de porte, coude à hauteur d’épaule. Avance d’un pas. Change à la moitié.' },
  plongeur: { nom: 'Plongeur', emoji: '🤿', s: 30, z: 'haut', consigne: 'Debout, penche le buste en avant, bras tendus devant toi comme pour plonger. Tiens, dos plat.' },
  'chien-mur': { nom: 'Chien au mur', emoji: '🐕‍🦺', s: 60, z: 'haut', consigne: 'Mains au mur, recule les pieds et descends la poitrine entre les bras, dos plat.' },
  'epaule-inversee': { nom: 'Épaules en arrière', emoji: '🔙', s: 30, z: 'haut', consigne: 'Mains jointes dans le dos, bras tendus. Lève-les doucement en ouvrant la poitrine.' },
  'calin-ours': { nom: 'Câlin de l’ours', emoji: '🐻', s: 30, z: 'haut', consigne: 'Croise les bras et attrape tes omoplates. Arrondis le haut du dos et respire dedans.' },
  'rotations-epaules': { nom: 'Rotations des épaules', emoji: '🔃', s: 30, z: 'haut', consigne: 'De grands cercles avec les épaules vers l’arrière, lentement.' },
  menton: { nom: 'Rentrer le menton', emoji: '😌', s: 30, z: 'haut', consigne: 'Recule la tête comme pour faire un double menton, sans baisser les yeux. Tiens 2 s, relâche, recommence.' },
  'cou-roule': { nom: 'Roulé du cou', emoji: '⭕', s: 30, z: 'haut', consigne: 'Fais rouler doucement la tête d’une épaule à l’autre en passant par l’avant.' },
  'oreille-epaule': { nom: 'Oreille vers l’épaule', emoji: '👂', s: 30, z: 'haut', consigne: 'Penche l’oreille vers l’épaule, sans lever l’épaule. Change de côté à la moitié.' },
  scalenes: { nom: 'Étirement des scalènes', emoji: '🤚', s: 30, z: 'haut', consigne: 'Mains croisées sous la clavicule, tire doucement vers le bas et regarde en haut, en diagonale. Change à la moitié.' },
  omoplate: { nom: 'Étirement de l’omoplate', emoji: '🙆', s: 30, z: 'haut', consigne: 'Une main derrière la tête, tire-la doucement vers l’aisselle opposée. Change à la moitié.' },
  'cou-flexion': { nom: 'Menton vers la poitrine', emoji: '⬇️', s: 30, z: 'haut', consigne: 'Mains derrière la tête, laisse doucement descendre le menton vers la poitrine.' },
  'cou-extension': { nom: 'Regard au plafond', emoji: '⬆️', s: 30, z: 'haut', consigne: 'Doigts sous le menton, pousse doucement la tête en arrière, regard vers le plafond.' },
  'cou-rotation': { nom: 'Rotation du cou', emoji: '↩️', s: 30, z: 'haut', consigne: 'Tourne lentement la tête pour regarder par-dessus une épaule, puis l’autre.' },
  'dos-mur': { nom: 'Dos au mur', emoji: '📏', s: 60, z: 'haut', consigne: 'Talons, fesses, omoplates et tête contre le mur. Rentre le menton et grandis-toi, sans cambrer.' },

  // Équilibre et pieds
  'une-jambe': { nom: 'Équilibre sur une jambe', emoji: '🦩', s: 30, z: 'equilibre', consigne: 'Tiens sur une jambe en regardant droit devant. Change à la moitié. Trop facile ? Ferme les yeux.' },
  chevilles: { nom: 'Cercles de chevilles', emoji: '🔁', s: 30, z: 'equilibre', consigne: 'Pied levé, dessine de grands cercles avec la cheville, dans un sens puis dans l’autre. Change de pied à la moitié.' },
  pointes: { nom: 'Montées sur pointes', emoji: '👣', s: 30, z: 'equilibre', consigne: 'Debout, monte sur la pointe des pieds, tiens 1 s, redescends lentement.' },
  'orteils-ecartes': { nom: 'Orteils écartés', emoji: '🖐️', s: 30, z: 'equilibre', consigne: 'Pieds nus, écarte les orteils le plus possible, tiens 3 s, relâche. Recommence.' },

  // Sauts
  masai: { nom: 'Sauts Masaï', emoji: '🦘', s: 60, z: 'sauts', sans: ['dos', 'genoux'], consigne: 'Sauts verticaux sur la pointe des pieds, jambes presque tendues, bras le long du corps. Atterris en douceur.' },
  repos: { nom: 'Repos', emoji: '😮‍💨', s: 30, z: 'calme', repos: true, consigne: 'Respire calmement, secoue les jambes.' },

  // Retour au calme
  enfant: { nom: 'Posture de l’enfant', emoji: '🧘', s: 60, z: 'calme', consigne: 'À genoux, assis sur les talons, bras tendus devant toi, front vers le sol. Relâche tout le dos.' },
  respiration: { nom: 'Respiration lente', emoji: '🌬️', s: 60, z: 'calme', consigne: 'Inspire 4 secondes par le nez, souffle 6 secondes par la bouche. Relâche les épaules.' },
};

const exclu = (id, profil) => (EXOS[id].sans || []).includes(profil.douleur);

function etape(id, s, i) {
  const e = EXOS[id];
  return { id: `${id}-${i}`, cle: id, nom: e.nom, emoji: e.emoji, consigne: e.consigne, repos: !!e.repos, fond: FOND[e.z], s };
}

const arrondi15 = (s) => Math.max(15, Math.round(s / 15) * 15);

/* ---------- Les 112 jours ---------- */

// Le jour 1 de Taller, tel quel (5:30).
const JOUR_1 = [['torsion-assise', 60], ['pigeon', 60], ['mollet-mur', 60], ['une-jambe', 30], ['triceps', 30], ['fente-arriere', 60], ['cactus', 30]];

// Chaque jour prend un exercice par zone, à tour de rôle, dans cet ordre.
const POOLS = {
  colonne: ['torsion-assise', 'cobra', 'fil-aiguille', 'chiot', 'torsion-allongee', 'chien', 'poupee', 'chameau', 'bascule-bassin'],
  hanches: ['pigeon', 'lezard', '90-90', 'figure-quatre', 'quadri-genou', 'jambes-ecartees', 'double-pigeon', 'squat-profond', 'fente-laterale'],
  jambes: ['mollet-mur', 'orteils', 'jambes-croisees', 'hurdler', 'flexion-assise', 'ischios-allonge', 'quadri-debout', 'fente-arriere', 'ecart-assis', 'quadri-cote', 'fente-avant'],
  haut: ['triceps', 'cactus', 'ouverture-poitrine', 'bras-croise', 'pecs-mur', 'plongeur', 'chien-mur', 'epaule-inversee', 'bras-mur', 'scalenes', 'omoplate'],
  equilibre: ['une-jambe', 'pointes', 'chevilles', 'orteils-ecartes'],
};
const ORDRE_ZONES = ['colonne', 'hanches', 'jambes', 'haut', 'equilibre'];
const ECHAUFFEMENTS = ['rotations-epaules', 'cou-roule', 'salut'];
const POSTURE_PERSO = ['menton', 'dos-mur', 'cactus', 'bras-mur'];

const TEXTES = [
  'Tout le corps, du cou aux chevilles : c’est chaque jour que ta posture se construit.',
  'Ta colonne et tes hanches s’ouvrent un peu plus : tu te tiens plus droit sans y penser.',
  'Aujourd’hui, des sauts : les impacts rendent tes os plus solides.',
  'Épaules en arrière, menton rentré : c’est ce qui se voit en premier.',
  'Des jambes souples, c’est un bassin bien placé et un dos droit.',
  'Deuxième séance de sauts de la semaine : courts, dynamiques, en douceur.',
  'Le défi du niveau : plus long que d’habitude. Termine-le pour gagner ton trophée.',
];

export const niveauDuJour = (n) => Math.ceil(n / JOURS_PAR_NIVEAU);
export const jourDansNiveau = (n) => ((n - 1) % JOURS_PAR_NIVEAU) + 1;
// Piments de difficulté, comme Taller : 1 au niveau 1, 6 au niveau 16.
export const nbPiments = (niveau) => Math.min(6, Math.max(1, Math.ceil(niveau / 3)));
export const piments = (niveau) => '🌶️'.repeat(nbPiments(niveau));
// Le rond « 👀 » : un jour par niveau dont on ne voit le contenu qu'en y arrivant.
export const jourSurprise = (niveau) => ((niveau * 3) % 6) + 1;
const JOURS_SAUTS = [3, 6];

/** La séance du jour n du parcours (1 à 112), adaptée à son profil. */
export function seanceDuParcours(n, profil = profilParcours()) {
  const niveau = niveauDuJour(n);
  const jour = jourDansNiveau(n);
  const pourToi = [];
  // Les temps montent par paliers de 15 s : +4 % par niveau, plafond +50 %.
  const facteur = Math.min(1.5, 1 + 0.04 * (niveau - 1)) * (profil.temps === '5' ? 0.8 : 1);
  // Comme chez Taller, un exercice ne dépasse jamais 1:00 : ensuite, on en ajoute.
  const duree = (id, base = EXOS[id].s) => (EXOS[id].repos ? base : Math.min(60, arrondi15(base * facteur)));
  const choisis = [];
  const deja = new Set();
  const sauts = n !== 1 && JOURS_SAUTS.includes(jour) && !exclu('masai', profil);
  const ajouter = (id, s) => { choisis.push([id, s ?? duree(id)]); deja.add(id); };

  if (n === 1) {
    for (const [id, s] of JOUR_1) {
      if (!exclu(id, profil)) { ajouter(id, s); continue; }
      const zone = EXOS[id].z;
      const remplacant = POOLS[zone].find((x) => !exclu(x, profil) && !deja.has(x) && !JOUR_1.some(([j]) => j === x));
      if (remplacant) ajouter(remplacant, EXOS[remplacant].s);
    }
  } else {
    // Nombre d'exercices : 6 au niveau 1, un de plus tous les 2 niveaux
    // (10 au plus), 3 de plus le jour du défi. Comme Taller : 15 min au plus.
    let combien = Math.min(10, 6 + Math.floor((niveau - 1) / 2)) + (jour === 7 ? 3 : 0);
    if (profil.sport === 'doux') combien -= 1;
    if (profil.sport === 'sportif') combien += 1;
    if (profil.temps === '5') combien = Math.min(combien, 6);
    if (profil.temps === '15') combien += 2;
    combien = Math.min(combien, 14);

    ajouter(ECHAUFFEMENTS[n % ECHAUFFEMENTS.length]);
    for (let k = 0; choisis.length - 1 < combien && k < combien * 4; k++) {
      const zone = ORDRE_ZONES[k % ORDRE_ZONES.length];
      if (zone === 'equilibre' && sauts) continue;
      const pool = POOLS[zone];
      // Le décalage change avec le jour : 2 ou 3 exercices nouveaux d'un jour à l'autre.
      for (let essai = 0; essai < pool.length; essai++) {
        const id = pool[(n * 2 + Math.floor(k / ORDRE_ZONES.length) * 3 + essai) % pool.length];
        if (!deja.has(id) && !exclu(id, profil)) { ajouter(id); break; }
      }
    }
    if (sauts) {
      // Comme la séance Masaï de Taller : saut, repos, saut…
      const tours = niveau <= 5 ? 1 : niveau <= 10 ? 2 : 3;
      const tempsSaut = niveau <= 5 ? 30 : niveau <= 10 ? 45 : 60;
      for (let t = 0; t < tours; t++) {
        choisis.push(['masai', tempsSaut]);
        if (t < tours - 1) choisis.push(['repos', 30]);
      }
    }
  }

  if (profil.voute) {
    // Un exercice de posture en plus, qui change d'un jour à l'autre.
    const id = POSTURE_PERSO.map((_, i) => POSTURE_PERSO[(n + i) % POSTURE_PERSO.length]).find((x) => !deja.has(x));
    if (id) {
      choisis.splice(1, 0, [id, duree(id)]);
      deja.add(id);
      pourToi.push(`${EXOS[id].nom} ajouté : tu nous as dit être voûté.`);
    }
  }
  if (n !== 1) {
    const fin = profil.sommeilFaible ? 'respiration' : jour % 2 ? 'enfant' : 'calin-ours';
    if (!deja.has(fin)) choisis.push([fin, Math.min(90, duree(fin))]);
  }

  if (profil.sommeilFaible) pourToi.push('Fais-la le soir : la respiration de la fin aide à t’endormir.');
  if (profil.sport === 'doux' && n !== 1) pourToi.push('Rythme doux pour commencer : tu fais peu de sport.');
  if (profil.sport === 'sportif' && n !== 1) pourToi.push('Un exercice de plus : tu es déjà sportif.');
  if (profil.douleur === 'dos') pourToi.push('Sans sauts ni Cobra ni Chameau : ton dos.');
  if (profil.douleur === 'genoux') pourToi.push('Sans fentes, sauts ni postures à genoux : tes genoux.');

  const etapes = choisis.map(([id, s], i) => etape(id, s, i));
  const texte = n === 1
    ? 'Bienvenue au jour 1 de ton parcours. Au fil des jours, la séance devient un peu plus difficile.'
    : JOURS_SAUTS.includes(jour) && !sauts ? TEXTES[jour === 3 ? 1 : 4] : TEXTES[jour - 1];
  return { cle: cleJourParcours(n), titre: `Jour ${jour}`, sousTitre: `Niv. ${niveau}`, texte, etapes, pourToi, n, niveau, jour };
}

/* ---------- La bibliothèque (l'onglet « Train » de Taller) ---------- */

// Les séances vues chez Taller, avec leurs exercices et leurs durées.
export const BIBLIOTHEQUE = [
  {
    zone: 'Posture', emoji: '🧍', seances: [
      { id: 'posture-1', nom: 'Cou de téléphone', exos: [['rotations-epaules', 30], ['menton', 30], ['cou-flexion', 30], ['cou-extension', 30], ['oreille-epaule', 30], ['omoplate', 30], ['cactus', 30], ['dos-mur', 60]] },
      { id: 'posture-2', nom: 'Bassin', exos: [['bascule-bassin', 60], ['figure-quatre', 60], ['quadri-genou', 60], ['chiot', 30], ['enfant', 60]] },
      { id: 'posture-3', nom: 'Posture stable', exos: [['dos-mur', 60], ['bras-mur', 30], ['cactus', 30], ['epaule-inversee', 30], ['une-jambe', 30], ['menton', 30], ['calin-ours', 30]] },
      { id: 'posture-4', nom: 'Posture express', exos: [['rotations-epaules', 30], ['menton', 30], ['ouverture-poitrine', 30], ['cactus', 30], ['dos-mur', 60]] },
    ],
  },
  {
    zone: 'Sauts Masaï', emoji: '🦘', seances: [
      { id: 'sauts-1', nom: 'Sauts Masaï 1', exos: [['chevilles', 30], ['masai', 60], ['repos', 30], ['masai', 60], ['repos', 30], ['masai', 60], ['repos', 30], ['mollet-mur', 60]] },
      { id: 'sauts-2', nom: 'Sauts Masaï 2', exos: [['chevilles', 30], ['masai', 60], ['repos', 30], ['masai', 60], ['repos', 30], ['masai', 60], ['repos', 30], ['masai', 60], ['repos', 30], ['mollet-mur', 60]] },
    ],
  },
  {
    zone: 'Haut du corps', emoji: '💪', seances: [
      { id: 'haut-1', nom: 'Haut du corps 1', exos: [['rotations-epaules', 30], ['ouverture-poitrine', 30], ['bras-croise', 30], ['triceps', 30], ['bras-mur', 30], ['cactus', 30], ['calin-ours', 30]] },
      { id: 'haut-2', nom: 'Haut du corps 2', exos: [['rotations-epaules', 30], ['ouverture-poitrine', 30], ['bras-croise', 60], ['triceps', 60], ['bras-mur', 60], ['pecs-mur', 60], ['plongeur', 30], ['chien-mur', 60], ['cactus', 30], ['calin-ours', 30]] },
      { id: 'haut-3', nom: 'Haut du corps 3', exos: [['ouverture-poitrine', 30], ['triceps', 30], ['pecs-mur', 30], ['plongeur', 30], ['chien-mur', 60], ['epaule-inversee', 30], ['cobra', 30], ['calin-ours', 30]] },
    ],
  },
  {
    zone: 'Pieds et chevilles', emoji: '🦶', seances: [
      { id: 'pieds-1', nom: 'Pieds et chevilles 1', exos: [['une-jambe', 60], ['chevilles', 60], ['pointes', 30], ['orteils-ecartes', 30], ['mollet-mur', 60]] },
      { id: 'pieds-2', nom: 'Pieds et chevilles 2', exos: [['une-jambe', 60], ['chevilles', 60], ['pointes', 60], ['orteils-ecartes', 60], ['mollet-mur', 60], ['une-jambe', 60], ['pointes', 60], ['mollet-mur', 60]] },
    ],
  },
  {
    zone: 'Poitrine', emoji: '🫶', seances: [
      { id: 'poitrine-1', nom: 'Poitrine 1', exos: [['ouverture-poitrine', 30], ['bras-croise', 30], ['bras-mur', 60], ['pecs-mur', 60], ['epaule-inversee', 30], ['menton', 30], ['calin-ours', 60]] },
      { id: 'poitrine-2', nom: 'Poitrine 2', exos: [['ouverture-poitrine', 30], ['bras-mur', 60], ['pecs-mur', 60], ['fil-aiguille', 60], ['cobra', 30], ['chiot', 30], ['calin-ours', 60]] },
      { id: 'poitrine-3', nom: 'Poitrine 3', exos: [['ouverture-poitrine', 30], ['bras-croise', 30], ['bras-mur', 60], ['fil-aiguille', 60], ['cobra', 30], ['chiot', 60], ['chameau', 30], ['torsion-allongee', 60], ['enfant', 60]] },
    ],
  },
  {
    zone: 'Bas du corps', emoji: '🦵', seances: [
      { id: 'bas-1', nom: 'Bas du corps 1', exos: [['jambes-ecartees', 30], ['fente-avant', 60], ['fente-arriere', 60], ['fente-laterale', 60], ['chien', 30], ['pigeon', 60]] },
      { id: 'bas-2', nom: 'Bas du corps 2', exos: [['jambes-ecartees', 30], ['fente-avant', 60], ['fente-arriere', 60], ['fente-laterale', 60], ['quadri-genou', 60], ['chien', 30], ['pigeon', 60], ['double-pigeon', 60], ['hurdler', 60], ['torsion-assise', 60]] },
      { id: 'bas-3', nom: 'Bas du corps 3', exos: [['jambes-ecartees', 30], ['fente-avant', 60], ['fente-arriere', 60], ['fente-laterale', 60], ['quadri-genou', 60], ['chien', 30], ['lezard', 60], ['pigeon', 60], ['double-pigeon', 60], ['hurdler', 60], ['90-90', 60], ['torsion-assise', 60], ['figure-quatre', 60], ['enfant', 60]] },
    ],
  },
  {
    zone: 'Cou', emoji: '🦒', seances: [
      { id: 'cou-1', nom: 'Cou 1', exos: [['rotations-epaules', 15], ['cou-roule', 15], ['salut', 15], ['menton', 15], ['plongeur', 15], ['cactus', 15], ['cou-extension', 15], ['cou-flexion', 15], ['oreille-epaule', 15], ['scalenes', 15], ['omoplate', 15], ['cou-rotation', 15], ['bras-mur', 30], ['bras-croise', 30], ['triceps', 30], ['epaule-inversee', 15], ['calin-ours', 15]] },
      { id: 'cou-2', nom: 'Cou 2', exos: [['rotations-epaules', 30], ['cou-roule', 30], ['salut', 30], ['menton', 30], ['plongeur', 30], ['cactus', 30], ['cou-extension', 30], ['cou-flexion', 30], ['oreille-epaule', 30], ['scalenes', 30], ['omoplate', 30], ['cou-rotation', 30], ['bras-mur', 30], ['bras-croise', 30], ['triceps', 30]] },
      { id: 'cou-3', nom: 'Cou 3', exos: [['rotations-epaules', 30], ['cou-roule', 30], ['salut', 30], ['menton', 30], ['plongeur', 30], ['cactus', 30], ['cou-extension', 30], ['cou-flexion', 30], ['oreille-epaule', 30], ['scalenes', 30], ['omoplate', 30], ['cou-rotation', 30], ['bras-mur', 60], ['bras-croise', 60], ['triceps', 60], ['epaule-inversee', 30], ['calin-ours', 30]] },
    ],
  },
  {
    zone: 'Épaules', emoji: '🤲', seances: [
      { id: 'epaules-1', nom: 'Épaules 1', exos: [['ouverture-poitrine', 30], ['bras-croise', 30], ['epaule-inversee', 30], ['triceps', 30], ['bras-mur', 30], ['flexion-avant', 30], ['pecs-mur', 30], ['plongeur', 30], ['chien-mur', 60]] },
      { id: 'epaules-2', nom: 'Épaules 2', exos: [['ouverture-poitrine', 30], ['bras-croise', 30], ['epaule-inversee', 30], ['triceps', 30], ['bras-mur', 60], ['flexion-avant', 30], ['pecs-mur', 60], ['plongeur', 30], ['chien-mur', 30], ['rotations-epaules', 60], ['cou-roule', 30], ['oreille-epaule', 30], ['cactus', 30], ['calin-ours', 30], ['cobra', 30]] },
    ],
  },
  {
    zone: 'Ischios', emoji: '🦿', seances: [
      { id: 'ischios-1', nom: 'Ischios 1', exos: [['orteils', 30], ['jambes-croisees', 60], ['jambes-ecartees', 30], ['fente-laterale', 60], ['fente-arriere', 60], ['flexion-assise', 30], ['hurdler', 60]] },
      { id: 'ischios-2', nom: 'Ischios 2', exos: [['orteils', 30], ['jambes-croisees', 60], ['jambes-ecartees', 30], ['fente-laterale', 60], ['fente-arriere', 60], ['chien', 30], ['pigeon', 60], ['flexion-assise', 30], ['hurdler', 60], ['ecart-assis', 30], ['figure-quatre', 60], ['ischios-allonge', 60]] },
      { id: 'ischios-3', nom: 'Ischios 3', exos: [['poupee', 30], ['orteils', 30], ['jambes-croisees', 60], ['quadri-debout', 60], ['jambes-ecartees', 30], ['squat-profond', 30], ['fente-laterale', 60], ['fente-arriere', 60], ['quadri-genou', 60], ['cobra', 30], ['chien', 30], ['lezard', 60], ['pigeon', 60], ['flexion-assise', 30], ['hurdler', 60], ['quadri-cote', 60], ['ecart-assis', 30], ['figure-quatre', 60], ['ischios-allonge', 60]] },
    ],
  },
];

/** Une séance de la bibliothèque, sans les exercices que sa douleur interdit. */
export function seanceLibre(id, profil = profilParcours()) {
  for (const zone of BIBLIOTHEQUE) {
    const s = zone.seances.find((x) => x.id === id);
    if (!s) continue;
    const exos = s.exos.filter(([e, d]) => EXOS[e] && d > 0 && !exclu(e, profil));
    const retires = s.exos.length - exos.length;
    return {
      cle: cleLibre(id),
      titre: s.nom,
      sousTitre: zone.zone,
      texte: `Une séance libre, en plus de ton jour. Elle ne fait pas avancer ton parcours mais compte pour ta série.`,
      pourToi: retires > 0 && profil.douleur !== 'aucune' ? [`Exercices retirés : ${profil.douleur === 'dos' ? 'ton dos' : 'tes genoux'}.`] : [],
      etapes: exos.map(([e, d], i) => etape(e, d, i)),
    };
  }
  return null;
}

// Les zones à mettre en avant pour lui.
export function zonesRecommandees(profil) {
  const z = [];
  if (profil.voute) z.push('Posture', 'Cou', 'Épaules');
  if (profil.sport === 'doux') z.push('Pieds et chevilles');
  return z;
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

export function FicheSeance({ seance, faite, ouverte, onFermer, onCommencer }) {
  const [durees, setDurees] = useState(() => seance.etapes.map((e) => e.s));
  const [detail, setDetail] = useState(null);
  const total = durees.reduce((t, s) => t + s, 0);
  const regler = (i, delta) => setDurees((d) => d.map((s, j) => (j === i ? Math.min(180, Math.max(15, s + delta)) : s)));

  // Échap ferme, comme la croix.
  useEffect(() => {
    const touche = (e) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  return (
    <div className="fiche" role="dialog" aria-modal="true" aria-label={seance.titre}>
      <div className="fiche-haut">
        <button type="button" className="fiche-fermer" onClick={onFermer} aria-label="Fermer">
          <X size={22} aria-hidden="true" />
        </button>
        <h2 className="fiche-titre">{seance.titre}</h2>
        <span className="fiche-niveau">{seance.sousTitre}</span>
      </div>
      <div className="fiche-defile">
        <p className="fiche-meta">{formatDuree(total).toUpperCase()} · {seance.etapes.filter((e) => !e.repos).length} EXERCICES</p>
        <p className="fiche-texte">{seance.texte}</p>
        {seance.pourToi.length > 0 && (
          <div className="fiche-pour-toi">
            <p className="fiche-pour-toi-titre">Adapté à toi</p>
            <ul>{seance.pourToi.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
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
        <p className="fiche-securite">Ça tire, ça ne fait pas mal. Si tu as mal, arrête l’exercice et passe au suivant.</p>
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

/* ---------- Les réglages du parcours ---------- */

function Reglages({ prefs, onPref, onFermer }) {
  return (
    <div className="app-carte parcours-reglages">
      <p className="parcours-reglages-titre">Adapte ton parcours</p>
      {Object.entries(REGLAGES).map(([groupe, { question, choix, defaut }]) => (
        <fieldset key={groupe} className="parcours-reglage">
          <legend>{question}</legend>
          <div className="parcours-choix">
            {choix.map(([valeur, libelle]) => {
              const actif = (prefs[groupe] || defaut) === valeur;
              return (
                <button key={valeur} type="button" className={`parcours-choix-bouton ${actif ? 'actif' : ''}`} aria-pressed={actif} onClick={() => onPref(groupe, valeur)}>
                  {libelle}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <button type="button" className="parcours-reglages-ok" onClick={onFermer}>C’est bon</button>
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

export function Parcours({ joursFaits, aujourdhuiFait, onOuvrirJour, profil, prefs, prefsConnues, onPref }) {
  const { prochain, ouvert, fini, faits } = etatParcours(joursFaits, aujourdhuiFait);
  const niveauCourant = niveauDuJour(prochain);
  const refCourant = useRef(null);
  const [reglagesOuverts, setReglagesOuverts] = useState(!prefsConnues);

  // À l'ouverture, on amène le niveau en cours à l'écran.
  useEffect(() => {
    if (niveauCourant > 1) refCourant.current?.scrollIntoView({ block: 'center' });
  }, [niveauCourant]);

  return (
    <div className="parcours">
      <div className="parcours-tete">
        <div>
          <p className="parcours-tete-libelle">Ton parcours</p>
          <p className="parcours-tete-chiffre">{fini ? 'Terminé 🏆' : `Niveau ${niveauCourant} · Jour ${jourDansNiveau(prochain)}`}</p>
        </div>
        <button type="button" className="parcours-tete-reglages" onClick={() => setReglagesOuverts((o) => !o)} aria-expanded={reglagesOuverts}>
          Réglages
        </button>
      </div>
      <span className="parcours-hero-barre" aria-hidden="true"><span style={{ width: `${(faits / NB_JOURS_PARCOURS) * 100}%` }} /></span>
      <span className="parcours-hero-pct">Progression {Math.round((faits / NB_JOURS_PARCOURS) * 100)} %</span>

      {reglagesOuverts && <Reglages prefs={prefs} onPref={onPref} onFermer={() => setReglagesOuverts(false)} />}

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

    </div>
  );
}

/* ---------- Les séances libres (l'onglet « Train » de Taller) ----------
   « Browse by area » : la liste des zones, puis les séances de la zone. */

// La couleur du rond de chaque zone, comme les dessins de Taller.
const FOND_ZONE = {
  Posture: '#1f4a52', 'Sauts Masaï': '#7a5a12', 'Haut du corps': '#3a2b5c', 'Pieds et chevilles': '#6b3a2a',
  Poitrine: '#5c2330', 'Bas du corps': '#2c4a2a', Cou: '#4a4220', Épaules: '#25324f', Ischios: '#5a3418',
};

export function Seances({ profil, libresFaites, onOuvrirLibre, progression = 0, aujourdhuiFait, onCommencerProgramme }) {
  const [zoneOuverte, setZoneOuverte] = useState(null);
  const recommandees = zonesRecommandees(profil);
  const zones = [...BIBLIOTHEQUE].sort((a, b) => recommandees.includes(b.zone) - recommandees.includes(a.zone));
  const zone = zones.find((z) => z.zone === zoneOuverte);

  useEffect(() => {
    if (!zone) return undefined;
    const touche = (e) => { if (e.key === 'Escape') setZoneOuverte(null); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [zone]);

  return (
    <div className="seances">
      <div className="seances-progression">
        <span>Progression</span>
        <span className="seances-progression-barre" aria-hidden="true"><span style={{ width: `${progression}%` }} /></span>
        <span>{progression} %</span>
      </div>
      <button type="button" className="seances-programme" onClick={onCommencerProgramme}>
        {aujourdhuiFait ? 'Voir mon programme' : 'Commencer mon programme'} <span aria-hidden="true">→</span>
      </button>

      <p className="seances-titre">Par zone</p>
      <div className="seances-zones">
        {zones.map((z) => (
          <button key={z.zone} type="button" className="seances-zone" onClick={() => setZoneOuverte(z.zone)}>
            <span className="seances-zone-rond" style={{ background: FOND_ZONE[z.zone] }} aria-hidden="true">{z.emoji}</span>
            <span className="seances-zone-nom">{z.zone}</span>
            {recommandees.includes(z.zone) && <span className="seances-zone-reco">Pour toi</span>}
          </button>
        ))}
      </div>

      {zone && (
        <div className="seances-plein" role="dialog" aria-modal="true" aria-label={zone.zone}>
          <div className="fiche-haut">
            <button type="button" className="fiche-fermer" onClick={() => setZoneOuverte(null)} aria-label="Fermer">
              <X size={22} aria-hidden="true" />
            </button>
            <h2 className="fiche-titre">{zone.zone}</h2>
            <span />
          </div>
          <ul className="seances-plein-liste">
            {zone.seances.map((x) => {
              const seance = seanceLibre(x.id, profil);
              const faite = libresFaites.has(cleLibre(x.id));
              return (
                <li key={x.id}>
                  <button type="button" className="seances-plein-ligne" onClick={() => onOuvrirLibre(x.id)}>
                    {/* Comme Taller : une image par séance, ici son premier vrai exercice. */}
                    <span className="seances-plein-carre" style={{ background: seance.etapes[1]?.fond || FOND_ZONE[zone.zone] }} aria-hidden="true">{seance.etapes[1]?.emoji || zone.emoji}</span>
                    <span className="seances-plein-textes">
                      <span className="seances-plein-nom">{x.nom}</span>
                      <span className={`seances-plein-duree ${faite ? 'faite' : ''}`}>{faite ? 'FAITE AUJOURD’HUI ✓' : formatDuree(dureeSecondes(seance.etapes)).toUpperCase().replace('MIN', 'MINUTES')}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
