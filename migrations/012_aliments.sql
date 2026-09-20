-- ============================================================
--  CATALOGUE D ALIMENTS
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  Une cinquantaine d aliments, choisis sur deux criteres :
--  ce qu un adolescent francais mange reellement (y compris les pizzas
--  et les frites — un journal alimentaire ou l on ne peut pas noter ce
--  qu on a vraiment mange se remplit faux, puis ne se remplit plus), et
--  ce qui pese sur les quatre nutriments suivis.
--
--  TOUTES LES VALEURS SONT POUR 100 g. Sans exception. Melanger
--  « pour 100 g » et « par portion » dans la meme colonne est l erreur
--  classique de ce genre de table, et elle ne se voit qu au moment ou un
--  total est trois fois trop grand.
--
--  PRECISION REELLE : ces chiffres sont des valeurs de reference, de
--  l ordre de ±15 % selon la variete, la saison, la cuisson et la
--  marque. C est suffisant pour reperer un ecart d apport ; ce n est pas
--  suffisant pour annoncer « il te manque 12 g de proteines ». Les
--  ecrans qui les affichent doivent rester a ce niveau de granularite.
--
--  La vitamine D est en UI (1 µg = 40 UI) pour coller a l etiquetage des
--  complements, qui est ce que l utilisateur a sous les yeux.
--
--  `portion_g` est la portion usuelle, pour proposer « 1 yaourt = 125 g »
--  plutot que de faire taper un poids. NULL quand ca n a pas de sens.
--
--  Sans risque : ON CONFLICT (slug) DO UPDATE. Relancer met a jour sans
--  dupliquer, et sans toucher aux repas deja enregistres — meal_logs
--  RECOPIE les valeurs au moment de la saisie, precisement pour qu une
--  correction de fiche ne reecrive pas le passe.
-- ============================================================

INSERT INTO aliments (slug, nom_fr, kcal, proteines_g, calcium_mg, vit_d_ui, portion_g, categorie) VALUES

-- ---------- Produits laitiers ----------
('lait-demi-ecreme',   'Lait demi-écrémé',            46,  3.3,  120,   0.8, 250,  'laitier'),
('yaourt-nature',      'Yaourt nature',               61,  4.0,  150,   1.6, 125,  'laitier'),
('fromage-blanc',      'Fromage blanc 3 %',           72,  7.7,  110,   0,   100,  'laitier'),
('skyr',               'Skyr nature',                 63, 11.0,  150,   0,   150,  'laitier'),
('petit-suisse',       'Petit-suisse',               145,  9.0,  110,   0,    60,  'laitier'),
('emmental',           'Emmental',                   380, 28.0, 1000,  12,    30,  'laitier'),
('comte',              'Comté',                      410, 27.0,  900,  12,    30,  'laitier'),
('camembert',          'Camembert',                  300, 20.0,  400,  16,    30,  'laitier'),
('mozzarella',         'Mozzarella',                 280, 18.0,  500,   8,   125,  'laitier'),
('boisson-soja',       'Boisson soja enrichie',       40,  3.0,  120,  60,   250,  'laitier'),

-- ---------- Viandes, poissons, oeufs ----------
('poulet-blanc',       'Blanc de poulet',            165, 31.0,   10,   8,   120,  'proteine'),
('steak-hache-5',      'Steak haché 5 %',            150, 21.0,   10,   4,   125,  'proteine'),
('jambon-blanc',       'Jambon blanc',               110, 20.0,    8,  16,    40,  'proteine'),
('oeuf',               'Œuf entier',                 145, 12.5,   50,  80,    55,  'proteine'),
('saumon',             'Saumon',                     200, 20.0,   15, 400,   130,  'proteine'),
('sardines-huile',     'Sardines à l''huile',        220, 25.0,  400, 280,    90,  'proteine'),
('maquereau',          'Maquereau',                  205, 19.0,   15, 320,   120,  'proteine'),
('thon-boite',         'Thon en boîte',              130, 26.0,   15,  80,    80,  'proteine'),
('cabillaud',          'Cabillaud',                   80, 18.0,   15,  40,   130,  'proteine'),
('tofu',               'Tofu nature',                120, 12.0,  350,   0,   100,  'proteine'),

-- ---------- Feculents ----------
('flocons-avoine',     'Flocons d''avoine',          380, 13.0,   50,   0,    60,  'feculent'),
('pain-complet',       'Pain complet',               250,  9.0,   40,   0,    50,  'feculent'),
('pain-de-mie',        'Pain de mie',                270,  8.0,   60,   0,    30,  'feculent'),
('riz-cuit',           'Riz cuit',                   130,  2.7,   10,   0,   180,  'feculent'),
('pates-cuites',       'Pâtes cuites',               130,  5.0,   10,   0,   200,  'feculent'),
('semoule-cuite',      'Semoule cuite',              115,  4.0,    8,   0,   180,  'feculent'),
('pommes-de-terre',    'Pommes de terre cuites',      85,  2.0,    8,   0,   200,  'feculent'),
('quinoa-cuit',        'Quinoa cuit',                120,  4.4,   17,   0,   180,  'feculent'),
('lentilles-cuites',   'Lentilles cuites',           115,  9.0,   20,   0,   150,  'feculent'),
('pois-chiches',       'Pois chiches cuits',         140,  8.0,   45,   0,   150,  'feculent'),
('haricots-rouges',    'Haricots rouges cuits',      125,  8.0,   35,   0,   150,  'feculent'),
('cereales-petit-dej', 'Céréales petit-déjeuner',    380,  8.0,  400,   0,    40,  'feculent'),

-- ---------- Legumes ----------
('brocoli',            'Brocoli cuit',                35,  3.0,   47,   0,   150,  'legume'),
('epinards',           'Épinards cuits',              25,  2.7,  100,   0,   150,  'legume'),
('haricots-verts',     'Haricots verts',              30,  1.8,   45,   0,   150,  'legume'),
('carotte',            'Carotte',                     36,  0.8,   30,   0,   100,  'legume'),
('tomate',             'Tomate',                      18,  0.8,   10,   0,   120,  'legume'),
('courgette',          'Courgette',                   20,  1.2,   20,   0,   150,  'legume'),
('champignons',        'Champignons de Paris',        22,  3.0,    5,   8,   100,  'legume'),

-- ---------- Fruits ----------
('banane',             'Banane',                      90,  1.1,    6,   0,   120,  'fruit'),
('pomme',              'Pomme',                       54,  0.3,    5,   0,   150,  'fruit'),
('orange',             'Orange',                      45,  1.0,   40,   0,   150,  'fruit'),
('kiwi',               'Kiwi',                        60,  1.1,   34,   0,    75,  'fruit'),
('fraises',            'Fraises',                     32,  0.7,   16,   0,   150,  'fruit'),
('jus-orange',         'Jus d''orange',               45,  0.7,   11,   0,   200,  'fruit'),

-- ---------- Oleagineux ----------
('amandes',            'Amandes',                    630, 21.0,  250,   0,    30,  'oleagineux'),
('noix',               'Noix',                       700, 15.0,   90,   0,    30,  'oleagineux'),
('beurre-cacahuete',   'Beurre de cacahuète',        600, 25.0,   45,   0,    20,  'oleagineux'),
('graines-courge',     'Graines de courge',          560, 25.0,   45,   0,    25,  'oleagineux'),

-- ---------- Ce qu on mange vraiment ----------
-- Presents a dessein. Un journal ou l on ne peut pas noter la pizza du
-- samedi se remplit faux, puis ne se remplit plus.
('pizza-margherita',   'Pizza margherita',           250, 11.0,  200,   0,   300,  'plat'),
('burger',             'Hamburger',                  250, 15.0,   80,   0,   200,  'plat'),
('kebab',              'Kebab',                      215, 16.0,   60,   0,   350,  'plat'),
('nuggets',            'Nuggets de poulet',          290, 15.0,   20,   0,   100,  'plat'),
('frites',             'Frites',                     310,  3.4,   15,   0,   150,  'plat'),
('chocolat-noir',      'Chocolat noir 70 %',         570,  8.0,   60,   0,    25,  'autre'),
('pate-a-tartiner',    'Pâte à tartiner',            540,  6.0,  110,   0,    20,  'autre')

ON CONFLICT (slug) DO UPDATE SET
    nom_fr      = EXCLUDED.nom_fr,
    kcal        = EXCLUDED.kcal,
    proteines_g = EXCLUDED.proteines_g,
    calcium_mg  = EXCLUDED.calcium_mg,
    vit_d_ui    = EXCLUDED.vit_d_ui,
    portion_g   = EXCLUDED.portion_g,
    categorie   = EXCLUDED.categorie;


-- ============================================================
--  VERIFICATION
-- ============================================================
--  Deux controles qui attrapent les fautes de frappe les plus couteuses :
--  une valeur pour 100 g qui aurait ete saisie par portion (donc
--  aberrante), et une categorie vide.

SELECT 'aliments'                      AS controle, count(*)::text AS valeur FROM aliments
UNION ALL
SELECT 'kcal aberrantes (>900/100g)',  count(*)::text FROM aliments WHERE kcal > 900
UNION ALL
SELECT 'proteines aberrantes (>60g)',  count(*)::text FROM aliments WHERE proteines_g > 60
UNION ALL
SELECT 'calcium aberrant (>1400mg)',   count(*)::text FROM aliments WHERE calcium_mg > 1400
UNION ALL
SELECT 'sans categorie',               count(*)::text FROM aliments WHERE categorie = '' OR categorie IS NULL;
