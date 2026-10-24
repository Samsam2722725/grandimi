/* Les repas du jour (onglet Nutrition), sur le modèle de « Tes repas ! » de
   Taller : 3 repas par jour qui changent chaque jour, sur un cycle de
   14 jours, et une collation quand ses protéines ou son calcium sont
   faibles.

   Chez Taller, les portions sont minuscules (50 g de quinoa, 30 g de
   protéines sur la journée) : ici, de vraies portions d'ado, ramenées
   ensuite à SON objectif de protéines (calculé par le plan).

   Valeurs par portion, arrondies : de quoi guider, pas une table de
   diététicien. Un ingrédient « { t, sl } » a une version sans lactose.
   Étiquettes : viande, porc, poisson (pour les régimes). */

const SL = {
  yaourtGrec: { t: '150 g de yaourt grec', sl: '150 g de yaourt au soja' },
  skyr: { t: '150 g de skyr', sl: '150 g de yaourt au soja' },
  lait: { t: '250 ml de lait', sl: '250 ml de boisson soja enrichie en calcium' },
  fromageBlanc: { t: '150 g de fromage blanc', sl: '150 g de yaourt au soja' },
};

export const PETITS_DEJ = [
  { id: 'p1', nom: 'Bol quinoa, yaourt grec et fruits rouges', emoji: '🫐', garniture: '🍓', p: 19, g: 34, l: 12, ca: 200,
    recette: [SL.yaourtGrec, '60 g de quinoa cuit', '80 g de fruits rouges', '1 cuillère à soupe de graines de courge', '1 cuillère à café de miel'] },
  { id: 'p2', nom: 'Omelette et pain complet', emoji: '🍳', garniture: '🍞', p: 23, g: 38, l: 16, ca: 110, vitd: true,
    recette: ['3 œufs', '60 g de pain complet', '1 tomate', '1 verre de jus d’orange'] },
  { id: 'p3', nom: 'Porridge banane au lait', emoji: '🥣', garniture: '🍌', p: 17, g: 70, l: 12, ca: 330,
    recette: ['50 g de flocons d’avoine', SL.lait, '1 banane', '1 cuillère à café de beurre de cacahuète'] },
  { id: 'p4', nom: 'Tartines, fromage blanc et pomme', emoji: '🍞', garniture: '🍯', p: 18, g: 60, l: 5, ca: 180,
    recette: ['70 g de pain complet (2 tranches)', SL.fromageBlanc, '1 cuillère à café de miel', '1 pomme'] },
  { id: 'p5', nom: 'Œufs brouillés et avocat', emoji: '🍳', garniture: '🥑', p: 16, g: 40, l: 20, ca: 90, vitd: true,
    recette: ['2 œufs', '½ avocat', '60 g de pain complet', '1 orange'] },
  { id: 'p6', nom: 'Muesli au lait et kiwi', emoji: '🥣', garniture: '🥝', p: 16, g: 60, l: 12, ca: 350,
    recette: ['60 g de muesli sans sucre ajouté', SL.lait, '1 cuillère à soupe d’amandes', '1 kiwi'] },
  { id: 'p7', nom: 'Pancakes banane et skyr', emoji: '🥞', garniture: '🍓', p: 20, g: 55, l: 8, ca: 150, vitd: true,
    recette: ['1 œuf', '1 banane écrasée', '40 g de flocons d’avoine', { t: '100 g de skyr', sl: '100 g de yaourt au soja' }, 'Quelques fruits rouges'] },
  { id: 'p8', nom: 'Tartines beurre de cacahuète et lait', emoji: '🥜', garniture: '🥛', p: 20, g: 70, l: 16, ca: 330,
    recette: ['70 g de pain complet (2 tranches)', '1 cuillère à soupe de beurre de cacahuète', '1 banane', SL.lait] },
  { id: 'p9', nom: 'Skyr, granola et pomme', emoji: '🥣', garniture: '🍎', p: 20, g: 50, l: 10, ca: 200,
    recette: [SL.skyr, '40 g de granola', '1 pomme', '1 cuillère à soupe de noix'] },
  { id: 'p10', nom: 'Sandwich œuf et fromage', emoji: '🥪', garniture: '🧀', p: 22, g: 40, l: 16, ca: 260, vitd: true,
    recette: ['60 g de pain complet', '2 œufs', { t: '20 g d’emmental', sl: '20 g d’emmental (presque sans lactose)' }, '1 verre de jus d’orange'] },
  { id: 'p11', nom: 'Smoothie lait, banane et flocons', emoji: '🥤', garniture: '🍌', p: 19, g: 65, l: 14, ca: 380,
    recette: [{ t: '300 ml de lait', sl: '300 ml de boisson soja enrichie en calcium' }, '1 banane', '30 g de flocons d’avoine', '1 cuillère à soupe de beurre de cacahuète'] },
  { id: 'p12', nom: 'Bagel saumon fumé et fromage frais', emoji: '🥯', garniture: '🐟', p: 20, g: 50, l: 12, ca: 100, vitd: true, tags: ['poisson'],
    recette: ['1 bagel', '50 g de saumon fumé', { t: '30 g de fromage frais', sl: '30 g de fromage frais sans lactose' }, 'Quelques rondelles de concombre'] },
  { id: 'p13', nom: 'Yaourts, flocons et fruits secs', emoji: '🥣', garniture: '🌰', p: 14, g: 50, l: 10, ca: 350,
    recette: [{ t: '2 yaourts nature', sl: '2 yaourts au soja' }, '30 g de flocons d’avoine', '1 cuillère à soupe de noix', '2 abricots secs'] },
  { id: 'p14', nom: 'Œufs à la coque et mouillettes', emoji: '🥚', garniture: '🍞', p: 22, g: 40, l: 18, ca: 380, vitd: true,
    recette: ['2 œufs', '60 g de pain complet', SL.lait] },
];

export const DEJEUNERS = [
  { id: 'd1', nom: 'Bol quinoa, haricots noirs et poulet', emoji: '🫘', garniture: '🌽', p: 40, g: 45, l: 8, ca: 70, tags: ['viande'],
    recette: ['120 g de poulet', '80 g de quinoa cuit', '80 g de haricots noirs égouttés', '30 g de maïs', '1 cuillère à soupe de salsa', 'Une poignée de coriandre'] },
  { id: 'd2', nom: 'Pâtes au thon et à la tomate', emoji: '🍝', garniture: '🐟', p: 38, g: 70, l: 10, ca: 250, tags: ['poisson'],
    recette: ['90 g de pâtes (crues)', '100 g de thon au naturel', 'Sauce tomate', { t: '20 g de parmesan', sl: '20 g de parmesan (presque sans lactose)' }] },
  { id: 'd3', nom: 'Poulet, riz et brocolis', emoji: '🍗', garniture: '🥦', p: 40, g: 65, l: 10, ca: 100, tags: ['viande'],
    recette: ['130 g de poulet', '80 g de riz (cru)', '150 g de brocolis', '1 filet d’huile d’olive'] },
  { id: 'd4', nom: 'Salade de lentilles et œufs durs', emoji: '🫘', garniture: '🥚', p: 30, g: 45, l: 14, ca: 80, vitd: true,
    recette: ['80 g de lentilles (crues)', '2 œufs durs', '1 carotte râpée', 'Vinaigrette'] },
  { id: 'd5', nom: 'Wrap poulet et crudités', emoji: '🌯', garniture: '🥗', p: 38, g: 50, l: 14, ca: 280, tags: ['viande'],
    recette: ['2 galettes de blé', '120 g de poulet', 'Salade, tomate', { t: '30 g de fromage râpé', sl: '30 g d’emmental râpé (presque sans lactose)' }] },
  { id: 'd6', nom: 'Steak haché, purée et haricots verts', emoji: '🥩', garniture: '🥔', p: 32, g: 40, l: 10, ca: 120, tags: ['viande'],
    recette: ['125 g de steak haché 5 %', '200 g de purée de pommes de terre', '150 g de haricots verts'] },
  { id: 'd7', nom: 'Salade de pois chiches et feta', emoji: '🥗', garniture: '🧀', p: 22, g: 50, l: 20, ca: 350,
    recette: ['150 g de pois chiches', { t: '60 g de feta', sl: '60 g de tofu nature' }, 'Tomate, concombre', '1 filet d’huile d’olive', '40 g de pain'] },
  { id: 'd8', nom: 'Riz cantonais aux œufs et crevettes', emoji: '🍚', garniture: '🍤', p: 32, g: 70, l: 12, ca: 120, vitd: true, tags: ['poisson'],
    recette: ['80 g de riz (cru)', '2 œufs', '80 g de crevettes', '50 g de petits pois'] },
  { id: 'd9', nom: 'Croque-monsieur et salade', emoji: '🥪', garniture: '🥗', p: 30, g: 40, l: 18, ca: 400, tags: ['viande', 'porc'],
    recette: ['2 tranches de pain de mie complet', '2 tranches de jambon', { t: '30 g d’emmental', sl: '30 g d’emmental (presque sans lactose)' }, 'Salade verte'] },
  { id: 'd10', nom: 'Chili sin carne', emoji: '🌶️', garniture: '🫘', p: 22, g: 80, l: 8, ca: 250,
    recette: ['150 g de haricots rouges', '50 g de maïs', 'Sauce tomate et épices', '80 g de riz (cru)', { t: '30 g de fromage râpé', sl: '30 g d’emmental râpé (presque sans lactose)' }] },
  { id: 'd11', nom: 'Saumon, pommes de terre et salade', emoji: '🐟', garniture: '🥔', p: 30, g: 50, l: 18, ca: 50, vitd: true, tags: ['poisson'],
    recette: ['130 g de saumon', '250 g de pommes de terre', 'Salade verte'] },
  { id: 'd12', nom: 'Pâtes bolognaise', emoji: '🍝', garniture: '🥩', p: 35, g: 75, l: 14, ca: 180, tags: ['viande'],
    recette: ['90 g de pâtes (crues)', '100 g de bœuf haché', 'Sauce tomate', { t: '15 g de parmesan', sl: '15 g de parmesan (presque sans lactose)' }] },
  { id: 'd13', nom: 'Omelette aux pommes de terre', emoji: '🍳', garniture: '🥔', p: 22, g: 40, l: 18, ca: 80, vitd: true,
    recette: ['3 œufs', '200 g de pommes de terre', '1 oignon', 'Salade verte'] },
  { id: 'd14', nom: 'Taboulé au poulet', emoji: '🥗', garniture: '🍗', p: 35, g: 55, l: 8, ca: 60, tags: ['viande'],
    recette: ['70 g de semoule (crue)', '120 g de poulet', 'Tomate, concombre, menthe', 'Jus de citron'] },
];

export const DINERS = [
  { id: 's1', nom: 'Boulettes de dinde et spaghettis de courgette', emoji: '🧆', garniture: '🥒', p: 35, g: 50, l: 10, ca: 80, tags: ['viande'],
    recette: ['130 g de dinde hachée', '150 g de spaghettis de courgette', '60 g de pâtes (crues)', 'Sauce tomate, ail, basilic'] },
  { id: 's2', nom: 'Soupe de lentilles corail et pain', emoji: '🍲', garniture: '🍞', p: 25, g: 65, l: 8, ca: 200,
    recette: ['70 g de lentilles corail (crues)', '1 carotte', '60 g de pain complet', { t: '1 yaourt nature', sl: '1 yaourt au soja' }] },
  { id: 's3', nom: 'Poisson blanc, riz et courgettes', emoji: '🐟', garniture: '🍚', p: 32, g: 55, l: 6, ca: 60, tags: ['poisson'],
    recette: ['140 g de cabillaud', '70 g de riz (cru)', '1 courgette'] },
  { id: 's4', nom: 'Gratin de pâtes au jambon', emoji: '🧀', garniture: '🍝', p: 32, g: 60, l: 16, ca: 450, tags: ['viande', 'porc'],
    recette: ['80 g de pâtes (crues)', '2 tranches de jambon', { t: '40 g de gruyère râpé', sl: '40 g d’emmental râpé (presque sans lactose)' }, { t: '100 ml de lait', sl: '100 ml de boisson soja' }] },
  { id: 's5', nom: 'Tofu sauté, riz et légumes', emoji: '🥢', garniture: '🥦', p: 25, g: 55, l: 12, ca: 350,
    recette: ['150 g de tofu ferme', '70 g de riz (cru)', 'Légumes sautés', 'Sauce soja'] },
  { id: 's6', nom: 'Poulet au curry et riz', emoji: '🍛', garniture: '🍗', p: 38, g: 55, l: 10, ca: 80, tags: ['viande'],
    recette: ['130 g de poulet', '70 g de riz (cru)', { t: '2 cuillères à soupe de crème légère', sl: '2 cuillères à soupe de crème de soja' }, 'Curry'] },
  { id: 's7', nom: 'Quiche aux légumes et salade', emoji: '🥧', garniture: '🥗', p: 20, g: 35, l: 25, ca: 300, vitd: true,
    recette: [{ t: '1 part de quiche aux légumes (œufs, lait, fromage)', sl: '1 part de quiche aux légumes faite à la crème de soja' }, 'Salade verte'] },
  { id: 's8', nom: 'Sardines, pommes de terre et haricots verts', emoji: '🐟', garniture: '🥔', p: 25, g: 40, l: 15, ca: 380, vitd: true, tags: ['poisson'],
    recette: ['100 g de sardines en boîte', '200 g de pommes de terre vapeur', '150 g de haricots verts'] },
  { id: 's9', nom: 'Burger maison et salade', emoji: '🍔', garniture: '🥗', p: 35, g: 40, l: 18, ca: 250, tags: ['viande'],
    recette: ['1 pain à burger', '125 g de steak haché 5 %', { t: '1 tranche de fromage', sl: '1 tranche d’emmental (presque sans lactose)' }, 'Tomate, salade'] },
  { id: 's10', nom: 'Œufs cocotte aux épinards', emoji: '🥚', garniture: '🥬', p: 18, g: 35, l: 16, ca: 180, vitd: true,
    recette: ['2 œufs', '100 g d’épinards', { t: '2 cuillères à soupe de crème', sl: '2 cuillères à soupe de crème de soja' }, '60 g de pain'] },
  { id: 's11', nom: 'Dahl de pois chiches et riz', emoji: '🍛', garniture: '🫘', p: 22, g: 80, l: 8, ca: 200,
    recette: ['150 g de pois chiches', 'Tomate et épices', '70 g de riz (cru)', { t: '1 yaourt nature', sl: '1 yaourt au soja' }] },
  { id: 's12', nom: 'Dinde et purée de patate douce', emoji: '🦃', garniture: '🍠', p: 34, g: 55, l: 5, ca: 90, tags: ['viande'],
    recette: ['130 g de filet de dinde', '250 g de patate douce', '150 g de haricots verts'] },
  { id: 's13', nom: 'Pizza maison jambon-mozzarella', emoji: '🍕', garniture: '🧀', p: 32, g: 70, l: 18, ca: 400, tags: ['viande', 'porc'],
    recette: ['½ pâte à pizza', 'Sauce tomate', '2 tranches de jambon', { t: '60 g de mozzarella', sl: '60 g de mozzarella sans lactose' }] },
  { id: 's14', nom: 'Saumon, quinoa et brocolis', emoji: '🐟', garniture: '🥦', p: 34, g: 45, l: 18, ca: 90, vitd: true, tags: ['poisson'],
    recette: ['130 g de saumon', '70 g de quinoa (cru)', '150 g de brocolis'] },
];

// Ajoutée quand ses protéines ou son calcium sont faibles (questionnaire).
export const COLLATIONS = [
  { id: 'c1', nom: 'Verre de lait et banane', emoji: '🥛', garniture: '🍌', p: 9, g: 35, l: 3, ca: 300, recette: [SL.lait, '1 banane'] },
  { id: 'c2', nom: 'Skyr et noix', emoji: '🥣', garniture: '🌰', p: 17, g: 6, l: 9, ca: 150, recette: [SL.skyr, '1 cuillère à soupe de noix'] },
  { id: 'c3', nom: 'Fromage et pain complet', emoji: '🧀', garniture: '🍞', p: 12, g: 25, l: 12, ca: 400, recette: [{ t: '40 g d’emmental', sl: '40 g d’emmental (presque sans lactose)' }, '50 g de pain complet'] },
  { id: 'c4', nom: 'Yaourt à boire et pomme', emoji: '🥤', garniture: '🍎', p: 7, g: 35, l: 3, ca: 200, recette: [{ t: '1 yaourt à boire', sl: '1 yaourt au soja à boire' }, '1 pomme'] },
  { id: 'c5', nom: 'Œuf dur et compote', emoji: '🥚', garniture: '🍎', p: 7, g: 20, l: 5, ca: 30, vitd: true, recette: ['1 œuf dur', '1 compote sans sucre ajouté'] },
  { id: 'c6', nom: 'Fromage blanc et fruits rouges', emoji: '🥣', garniture: '🍓', p: 12, g: 15, l: 1, ca: 150, recette: [SL.fromageBlanc, '80 g de fruits rouges'] },
  { id: 'c7', nom: 'Amandes et lait chocolaté', emoji: '🌰', garniture: '🥛', p: 14, g: 30, l: 15, ca: 350, recette: ['20 g d’amandes', { t: '250 ml de lait chocolaté', sl: '250 ml de boisson soja chocolatée' }] },
];

export const REGIMES = [
  ['tout', 'Tout'],
  ['vegetarien', 'Végétarien'],
  ['sans-porc', 'Sans porc'],
  ['halal', 'Halal'],
  ['sans-lactose', 'Sans lactose'],
];

const interdit = (repas, regime) => {
  const tags = repas.tags || [];
  if (regime === 'vegetarien') return tags.includes('viande') || tags.includes('poisson');
  if (regime === 'sans-porc' || regime === 'halal') return tags.includes('porc');
  return false;
};

// Note sur 10 : protéines (5 points), calcium (3), vitamine D (1), +1.
export const scoreRepas = (r) => Math.max(4, Math.min(10, Math.round(Math.min(5, (r.p / 25) * 5) + Math.min(3, (r.ca / 300) * 3) + (r.vitd ? 1 : 0) + 1)));

// Les grammes et millilitres suivent son objectif ; le reste ne bouge pas.
const ajuster = (texte, f) => texte.replace(/^(\d+) (g|ml)\b/, (_, n, u) => `${Math.max(5, Math.round((Number(n) * f) / 5) * 5)} ${u}`);

function preparer(r, regime, f) {
  return {
    ...r,
    p: Math.round(r.p * f), g: Math.round(r.g * f), l: Math.round(r.l * f), ca: Math.round(r.ca * f),
    score: scoreRepas(r),
    recette: r.recette.map((x) => ajuster(typeof x === 'string' ? x : regime === 'sans-lactose' ? x.sl : x.t, f)),
  };
}

// Le n-ième repas du cycle, ou le suivant que son régime permet.
function choisir(liste, i, regime) {
  for (let k = 0; k < liste.length; k++) {
    const r = liste[(i + k) % liste.length];
    if (!interdit(r, regime)) return r;
  }
  return liste[i % liste.length];
}

/* ---------- Ses heures ---------- */

function enMinutes(h) {
  const m = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(am|pm)?/i.exec(String(h || ''));
  if (!m) return null;
  let heures = Number(m[1]) % 24;
  if (m[3] && m[3].toLowerCase() === 'pm' && heures < 12) heures += 12;
  if (m[3] && m[3].toLowerCase() === 'am' && heures === 12) heures = 0;
  return heures * 60 + Number(m[2] || 0);
}
const enTexte = (min) => {
  const arrondi = Math.round(min / 15) * 15;
  const h = Math.floor(arrondi / 60) % 24;
  const m = arrondi % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};

/** Les heures de ses repas : 30 min après son réveil, 12 h 30, 2 h 30 avant son coucher. */
export function heuresRepas(reveil, coucher) {
  const r = enMinutes(reveil);
  let c = enMinutes(coucher);
  if (c !== null && c < 12 * 60) c += 24 * 60; // coucher après minuit
  return {
    matin: r === null ? '8 h' : enTexte(Math.min(10 * 60, r + 30)),
    midi: '12 h 30',
    gouter: '16 h 30',
    soir: c === null ? '19 h' : enTexte(Math.max(18 * 60 + 30, Math.min(20 * 60 + 30, c - 150))),
  };
}

/* ---------- Les repas d'un jour ---------- */

/**
 * @param jour       numéro du jour (n'importe quel entier : on prend le jour du cycle)
 * @param regime     un des REGIMES
 * @param objectifP  ses protéines du jour, en g (calculées par le plan)
 * @param collation  ajouter une collation (protéines ou calcium faibles)
 */
// Le dessert ajouté les jours où le calcium manque.
const DESSERT = { t: '1 yaourt nature en dessert', sl: '1 yaourt au soja enrichi en calcium en dessert' };
const COLLATIONS_CALCIUM = COLLATIONS.filter((c) => c.ca >= 150);

export function repasDuJour({ jour = 0, regime = 'tout', objectifP = 80, objectifCa = 1300, collation = false, heures = heuresRepas() } = {}) {
  const i = ((jour % 14) + 14) % 14;
  const brut = [
    { ...choisir(PETITS_DEJ, i, regime), heure: heures.matin, moment: 'Petit-déjeuner' },
    { ...choisir(DEJEUNERS, i, regime), heure: heures.midi, moment: 'Déjeuner' },
    ...(collation ? [{ ...COLLATIONS_CALCIUM[i % COLLATIONS_CALCIUM.length], heure: heures.gouter, moment: 'Collation' }] : []),
    { ...choisir(DINERS, i, regime), heure: heures.soir, moment: 'Dîner' },
  ];
  // Un yaourt en dessert au dîner, puis au déjeuner, tant que le calcium
  // reste loin de son objectif.
  for (const moment of ['Dîner', 'Déjeuner']) {
    if (brut.reduce((t, r) => t + r.ca, 0) >= objectifCa * 0.75) break;
    const k = brut.findIndex((r) => r.moment === moment);
    const r = brut[k];
    // Pas deux yaourts dans le même repas.
    if (r.recette.some((x) => /yaourt/.test(typeof x === 'string' ? x : x.t))) continue;
    brut[k] ={ ...r, recette: [...r.recette, DESSERT], p: r.p + 4, g: r.g + 6, l: r.l + 3, ca: r.ca + 150 };
  }
  const total = brut.reduce((t, r) => t + r.p, 0);
  // Portions ramenées à son objectif, sans tomber dans l'excès.
  const f = Math.max(0.8, Math.min(1.3, objectifP / (total || 1)));
  const repas = brut.map((r) => preparer(r, regime, f));
  return {
    repas,
    totalP: repas.reduce((t, r) => t + r.p, 0),
    totalCa: repas.reduce((t, r) => t + r.ca, 0),
  };
}

// Numéro du jour local (change à minuit), pour faire tourner le cycle.
export function numeroDuJour(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
