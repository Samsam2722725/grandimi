import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';

import apiClient from '@/lib/api';

/* Les trois écrans de « Grandir », façon GoTall / Taller :
   - la séance du jour, guidée exercice par exercice avec un minuteur ;
   - la nutrition, en jauges qu'on remplit en cochant ce qu'on a mangé ;
   - le sommeil, « j'ai dormi … h » en un toucher et les 7 dernières nuits.

   Tout passe par les cases du jour déjà enregistrées côté serveur
   (task_completions, clé libre) : nutri-<aliment>, sommeil-h-<heures>,
   seance-du-jour. Rien à ajouter au serveur. */

/* ---------- Séance guidée ---------- */

// Mouvements repris du plan (suspension, étirements, gainage, posture).
// Durées de base en secondes ; elles montent un peu chaque mois.
const MOUVEMENTS = [
  { nom: 'Cercles des bras', emoji: '🔄', s: 40, consigne: 'Bras tendus sur les côtés, de petits cercles vers l’avant puis vers l’arrière.' },
  { nom: 'Étirement vers le haut', emoji: '🙆', s: 40, consigne: 'Debout, bras tendus au-dessus de la tête, monte sur la pointe des pieds et grandis-toi.' },
  { nom: 'Suspension à la barre', emoji: '🧗', s: 30, consigne: 'Suspends-toi bras tendus, épaules relâchées. Redescends en douceur, ne saute pas.' },
  { nom: 'Repos', emoji: '😮‍💨', s: 20, consigne: 'Respire calmement.', repos: true },
  { nom: 'Suspension à la barre', emoji: '🧗', s: 30, consigne: 'Encore une fois, bras tendus, sans balancer.' },
  { nom: 'Cobra', emoji: '🐍', s: 45, consigne: 'Allongé sur le ventre, mains sous les épaules, lève la poitrine en gardant le bassin au sol.' },
  { nom: 'Chat-vache', emoji: '🐈', s: 45, consigne: 'À quatre pattes, arrondis le dos puis creuse-le, lentement, avec la respiration.' },
  { nom: 'Planche', emoji: '🧱', s: 30, consigne: 'Sur les avant-bras, corps bien droit de la tête aux talons. Serre le ventre.' },
  { nom: 'Dos au mur', emoji: '🧍', s: 60, consigne: 'Talons, fesses, épaules et tête contre le mur. Rentre le menton, grandis-toi.' },
  { nom: 'Ouverture des épaules', emoji: '🤲', s: 40, consigne: 'Mains jointes dans le dos, bras tendus, ouvre la poitrine et recule les épaules.' },
  { nom: 'Posture de l’enfant', emoji: '🧎', s: 45, consigne: 'À genoux, assis sur les talons, bras tendus devant toi, front vers le sol. Relâche le dos.' },
];

export const CLE_SEANCE = 'seance-du-jour';

export function seanceDuMois(mois = 1) {
  const facteur = 1 + Math.min(0.5, 0.1 * (Math.max(1, mois) - 1));
  return MOUVEMENTS.map((m) => ({ ...m, s: m.repos ? m.s : Math.round((m.s * facteur) / 5) * 5 }));
}

export function dureeSeanceMin(mois = 1) {
  return Math.round(seanceDuMois(mois).reduce((t, m) => t + m.s, 0) / 60);
}

/* `etapes` : la séance du parcours (avec les durées réglées sur la fiche) ;
   sans elle, la séance du mois d'avant. `fin` : le texte de l'écran final.

   L'écran copie celui de Taller : « 1 / 7 », l'exercice dans un grand rond
   entouré de sa progression, le nom, le temps, et précédent / pause /
   suivant. Comme on n'a pas de dessin, « Comment faire » est écrit
   dessous, étape par étape. */
export function SeanceGuidee({ mois = 1, etapes: etapesDonnees, titre = 'Séance du jour', fin, onFermer, onTerminee }) {
  const [etapes] = useState(() => etapesDonnees || seanceDuMois(mois));
  const [index, setIndex] = useState(0);
  const [reste, setReste] = useState(etapes[0].s);
  const [enPause, setEnPause] = useState(false);
  const [finie, setFinie] = useState(false);
  const termineeRef = useRef(false);

  useEffect(() => {
    if (finie || enPause) return undefined;
    const t = setInterval(() => setReste((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [finie, enPause, index]);

  useEffect(() => {
    if (reste > 0 || finie) return;
    if (index + 1 < etapes.length) {
      setIndex(index + 1);
      setReste(etapes[index + 1].s);
      try { navigator.vibrate?.(120); } catch { /* pas de vibreur */ }
    } else {
      setFinie(true);
    }
  }, [reste, index, finie, etapes]);

  useEffect(() => {
    if (finie && !termineeRef.current) {
      termineeRef.current = true;
      onTerminee?.();
    }
  }, [finie, onTerminee]);

  const passer = () => setReste(0);
  const precedent = () => {
    const i = Math.max(0, index - 1);
    setIndex(i);
    setReste(etapes[i].s);
  };
  const etape = etapes[index];
  const rayon = 92;
  const circonference = 2 * Math.PI * rayon;
  const temps = (x) => `${Math.floor(Math.max(0, x) / 60)}:${String(Math.max(0, x) % 60).padStart(2, '0')}`;
  // Une phrase = une étape.
  const etapesComment = etape.comment || (etape.consigne || '').split(/(?<=[.!?])\s+/).filter(Boolean);

  return (
    <div className="seance seance--taller" role="dialog" aria-label={titre}>
      <div className="seance-tete">
        <button type="button" className="seance-fermer" onClick={onFermer} aria-label="Fermer la séance">
          <X size={24} aria-hidden="true" />
        </button>
        <span className="seance-compteur">{finie ? titre : `${index + 1} / ${etapes.length}`}</span>
        <span />
      </div>

      {finie ? (
        <div className="seance-fin">
          <p className="seance-emoji" aria-hidden="true">{fin?.emoji || '🔥'}</p>
          <h2>{fin?.titre || 'Séance terminée'}</h2>
          <p>{fin?.texte || 'Bien joué. Ta posture et ta colonne te disent merci. Reviens demain pour garder ta série.'}</p>
          <button type="button" className="funnel-cta" onClick={onFermer}>Retour à mon plan</button>
        </div>
      ) : (
        <>
          <div className="seance-corps">
            <div className="seance-anneau">
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r={rayon} className="seance-anneau-fond" />
                <circle
                  cx="100" cy="100" r={rayon} className={`seance-anneau-trait ${etape.repos ? 'repos' : ''}`}
                  strokeDasharray={circonference}
                  strokeDashoffset={circonference * (reste / etape.s)}
                />
              </svg>
              <span className="seance-image" style={{ background: etape.fond || '#1d1b1a' }} aria-hidden="true">{etape.emoji}</span>
            </div>
            <h2 className="seance-nom">{etape.nom}</h2>
            <p className="seance-temps" aria-live="off">{temps(reste)}</p>
            {etapesComment.length > 0 && !etape.repos && (
              <div className="seance-comment">
                <p className="seance-comment-titre">Comment faire</p>
                <ol>{etapesComment.map((e) => <li key={e}>{e}</li>)}</ol>
              </div>
            )}
            {etape.repos && <p className="seance-repos">{etape.consigne}</p>}
          </div>
          <div className="seance-boutons">
            <button type="button" className="seance-rond" onClick={precedent} disabled={index === 0} aria-label="Exercice précédent">
              <SkipBack size={24} aria-hidden="true" />
            </button>
            <button type="button" className="seance-rond seance-rond--grand" onClick={() => setEnPause((x) => !x)} aria-label={enPause ? 'Reprendre' : 'Pause'}>
              {enPause ? <Play size={30} aria-hidden="true" /> : <Pause size={30} aria-hidden="true" />}
            </button>
            <button type="button" className="seance-rond" onClick={passer} aria-label="Exercice suivant">
              <SkipForward size={24} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Exercices ---------- */

// `parcours` : l'écran du parcours, qui remplace la séance unique du mois.
export function ExercicesDuJour({ mois = 1, faite, onCommencer, exercicesDuPlan = [], parcours }) {
  const etapes = seanceDuMois(mois).filter((m) => !m.repos);
  const [ouvert, setOuvert] = useState(null);
  return (
    <>
      {parcours || (
      <>
      <div className="app-carte app-seance-carte">
        <div className="app-seance-tete">
          <span className="app-niveau">Niveau {mois}</span>
          <span className={`app-etat ${faite ? 'fait' : ''}`}>{faite ? 'Faite aujourd’hui ✓' : 'À faire'}</span>
        </div>
        <h2 className="app-carte-titre">Séance du jour</h2>
        <p className="app-seance-meta">{etapes.length} exercices · {dureeSeanceMin(mois)} min · sans matériel, sauf une barre</p>
        <button type="button" className="funnel-cta app-cta" onClick={onCommencer}>
          {faite ? 'Refaire la séance' : 'Commencer la séance'}
        </button>
      </div>

      <ul className="app-mouvements">
        {etapes.map((m, i) => (
          <li key={`${m.nom}-${i}`}>
            <span className="app-mouvement-emoji" aria-hidden="true">{m.emoji}</span>
            <span className="app-mouvement-textes">
              <span className="app-mouvement-nom">{m.nom}</span>
              <span className="app-mouvement-duree">{m.s} s</span>
            </span>
          </li>
        ))}
      </ul>
      </>
      )}

      {exercicesDuPlan.length > 0 && (
        <>
          <h2 className="app-carte-titre app-sous-titre">Tes exercices du mois</h2>
          <div className="card-grid">
            {exercicesDuPlan.map((exercise, idx) => {
              const estOuvert = ouvert === idx;
              return (
                <div key={idx} className="exercise-card card">
                  <h3>{exercise.name}</h3>
                  <div className="exercise-meta">
                    <span className="badge">{exercise.duration_min} min</span>
                    <span className="badge">{exercise.frequency}</span>
                  </div>
                  <button type="button" className="btn-tertiary" onClick={() => setOuvert(estOuvert ? null : idx)} aria-expanded={estOuvert}>
                    {estOuvert ? 'Masquer le détail' : 'Comment faire'}
                  </button>
                  {estOuvert && (
                    <div className="exercise-detail">
                      <p>{exercise.description}</p>
                      <p className="exercise-detail-line"><strong>Quand :</strong> {exercise.routine}</p>
                      <p className="exercise-detail-line"><strong>Ce que ça change :</strong> {exercise.impact}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

/* ---------- Nutrition ---------- */

// Valeurs moyennes par portion, arrondies : de quoi remplir les jauges,
// pas une table de diététicien.
export const ALIMENTS = [
  { id: 'lait', nom: 'Un verre de lait', emoji: '🥛', prot: 8, ca: 300 },
  { id: 'yaourt', nom: 'Un yaourt', emoji: '🥣', prot: 5, ca: 180 },
  { id: 'fromage', nom: 'Une part de fromage', emoji: '🧀', prot: 7, ca: 200 },
  { id: 'oeufs', nom: 'Deux œufs', emoji: '🥚', prot: 12, ca: 50, vitd: true },
  { id: 'viande', nom: 'Viande ou volaille', emoji: '🍗', prot: 25, ca: 15 },
  { id: 'poisson', nom: 'Poisson gras (saumon, sardines)', emoji: '🐟', prot: 20, ca: 80, vitd: true },
  { id: 'legumineuses', nom: 'Lentilles, pois chiches', emoji: '🫘', prot: 9, ca: 40 },
  { id: 'soleil', nom: '20 min dehors en journée', emoji: '☀️', prot: 0, ca: 0, vitd: true },
];

export const cleAliment = (id) => `nutri-${id}`;

export function scoreNutrition(completedKeys, cibles) {
  const pris = ALIMENTS.filter((a) => completedKeys.has(cleAliment(a.id)));
  const prot = pris.reduce((t, a) => t + a.prot, 0);
  const ca = pris.reduce((t, a) => t + a.ca, 0);
  const vitd = pris.filter((a) => a.vitd).length;
  const pProt = Math.min(1, prot / (cibles.prot || 1));
  const pCa = Math.min(1, ca / (cibles.ca || 1));
  const pVitd = Math.min(1, vitd / 2);
  return { prot, ca, vitd, pProt, pCa, pVitd, pct: Math.round(((pProt + pCa + pVitd) / 3) * 100) };
}

export function NutritionJauges({ completedKeys, basculer, cibles }) {
  const s = scoreNutrition(completedKeys, cibles);
  const jauges = [
    { nom: 'Protéines', valeur: `${s.prot}/${cibles.prot} g`, p: s.pProt, couleur: '#4ade80' },
    { nom: 'Calcium', valeur: `${s.ca.toLocaleString('fr-FR')}/${cibles.ca.toLocaleString('fr-FR')} mg`, p: s.pCa, couleur: '#f4efe9' },
    { nom: 'Vitamine D', valeur: `${s.vitd}/2 sources`, p: s.pVitd, couleur: '#facc15' },
  ];
  return (
    <>
      <div className="app-carte app-score-carte">
        <p className="app-score-libelle">Score nutrition du jour</p>
        <p className="app-score">{s.pct} %</p>
        <div className="app-jauges">
          {jauges.map((j) => (
            <div key={j.nom} className="app-jauge">
              <span className="app-jauge-nom">{j.nom}</span>
              <span className="app-jauge-valeur">{j.valeur}</span>
              <span className="app-domaine-barre"><span style={{ width: `${j.p * 100}%`, background: j.couleur }} /></span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="app-carte-titre app-sous-titre">Aujourd’hui, j’ai pris…</h2>
      <ul className="app-aliments">
        {ALIMENTS.map((a) => {
          const pris = completedKeys.has(cleAliment(a.id));
          return (
            <li key={a.id}>
              <button type="button" className={`app-aliment ${pris ? 'pris' : ''}`} onClick={() => basculer(cleAliment(a.id))} aria-pressed={pris}>
                <span className="app-aliment-emoji" aria-hidden="true">{a.emoji}</span>
                <span className="app-aliment-textes">
                  <span className="app-aliment-nom">{a.nom}</span>
                  <span className="app-aliment-apport">
                    {[a.prot ? `+${a.prot} g protéines` : '', a.ca ? `+${a.ca} mg calcium` : '', a.vitd ? 'vitamine D' : ''].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="app-aliment-coche" aria-hidden="true">{pris ? '✓' : '+'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ---------- Sommeil ---------- */

const HEURES = [5, 6, 7, 8, 9, 10];
const cleSommeil = (h) => `sommeil-h-${h}`;
export const heuresDormies = (keys) => {
  const k = [...keys].find((x) => /^sommeil-h-\d+$/.test(x));
  return k ? Number(k.slice('sommeil-h-'.length)) : null;
};

function dateLocale(decalage) {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function SommeilSuivi({ completedKeys, basculer, plan, apercu = false }) {
  const cible = Number(plan.sleep.hours) || 9;
  const cetteNuit = heuresDormies(completedKeys);
  const [nuits, setNuits] = useState([]);

  useEffect(() => {
    const jours = Array.from({ length: 6 }, (_, i) => dateLocale(i - 6));
    if (apercu) {
      setNuits(jours.map((date, i) => ({ date, h: [7, 8, null, 6, 9, 8][i] })));
      return;
    }
    Promise.all(jours.map((date) => apiClient.getTodayTasks(date).then((r) => ({ date, h: heuresDormies(new Set(r.completed_keys || [])) })).catch(() => ({ date, h: null }))))
      .then(setNuits);
  }, [apercu]);

  const choisir = (h) => {
    if (cetteNuit === h) return basculer(cleSommeil(h));
    if (cetteNuit != null) basculer(cleSommeil(cetteNuit));
    basculer(cleSommeil(h));
  };

  const toutes = [...nuits, { date: dateLocale(0), h: cetteNuit }];
  const renseignees = toutes.filter((n) => n.h != null);
  const pct = cetteNuit ? Math.min(100, Math.round((cetteNuit / cible) * 100)) : 0;
  const JOURS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  return (
    <>
      <div className="app-carte app-score-carte">
        <p className="app-score-libelle">Ce soir, couche-toi à</p>
        <p className="app-score">{plan.sleep.bedtime}</p>
        <p className="app-seance-meta">Réveil {plan.sleep.waketime} · objectif {cible} h · écrans coupés 45 min avant</p>
      </div>

      <h2 className="app-carte-titre app-sous-titre">Cette nuit, j’ai dormi…</h2>
      <div className="app-heures">
        {HEURES.map((h) => (
          <button key={h} type="button" className={`app-heure ${cetteNuit === h ? 'active' : ''}`} onClick={() => choisir(h)} aria-pressed={cetteNuit === h}>
            {h === 10 ? '10 h +' : `${h} h`}
          </button>
        ))}
      </div>
      {cetteNuit != null && (
        <p className="app-sommeil-verdict">
          {cetteNuit >= cible ? '✓ Objectif atteint. C’est la nuit que tu grandis.' : `${pct} % de ton objectif. Ce soir, vise ${plan.sleep.bedtime}.`}
        </p>
      )}

      <div className="app-carte app-nuits">
        <p className="app-score-libelle">Tes 7 dernières nuits{renseignees.length ? ` · moyenne ${(renseignees.reduce((t, n) => t + n.h, 0) / renseignees.length).toFixed(1).replace('.', ',')} h` : ''}</p>
        <div className="app-barres">
          {toutes.map((n) => {
            const d = new Date(`${n.date}T12:00:00`);
            const hauteur = n.h ? Math.min(100, (n.h / 10) * 100) : 4;
            return (
              <div key={n.date} className="app-barre-col">
                <span className={`app-barre ${n.h && n.h >= cible ? 'ok' : ''} ${n.h ? '' : 'vide'}`} style={{ height: `${hauteur}%` }} />
                <span className="app-barre-jour">{JOURS[d.getDay()]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sleep-tips">
        <h3>Pour mieux dormir</h3>
        <ul className="tips-list">
          <li>Chambre complètement sombre</li>
          <li>Température fraîche (18–20 °C)</li>
          <li>Pas d’écrans 45 min avant le coucher</li>
          <li>Pas de caféine après 15 h</li>
          <li>Même heure de coucher, à 30 min près</li>
        </ul>
      </div>
    </>
  );
}
