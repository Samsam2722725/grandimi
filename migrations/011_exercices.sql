-- ============================================================
--  LA BIBLIOTHEQUE D EXERCICES, ET CE QU ON A LE DROIT D EN DIRE
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  AVANT DE LIRE UNE SEULE LIGNE DE CONTENU
--
--  Aucun essai controle ne montre qu un etirement, une suspension ou
--  une posture augmente la taille ADULTE. La croissance s arrete a la
--  fusion des plaques de croissance, et rien de ce qui suit ne la
--  repousse. Un produit qui promet le contraire ment, et le jour ou un
--  journaliste ou un medecin s y interesse, il ne reste rien.
--
--  Deux effets REELS existent, et ce sont les seuls que la colonne
--  `benefice` a le droit d enoncer :
--
--   1. DECOMPRESSION. On perd 1 a 1,5 cm entre le lever et le coucher
--      par tassement des disques intervertebraux. Une decompression en
--      rend une partie. C est reversible, quotidien, et sans aucun
--      effet sur la taille finale. On le dit.
--
--   2. POSTURE. Une cyphose thoracique marquee ou une anteversion du
--      bassin coutent de la taille DEBOUT MESUREE. Les corriger en
--      recupere 1 a 3 cm chez qui en a une, et ceux-la sont durables.
--      Ce n est pas de la croissance, c est de la recuperation — et
--      c est verifiable par l utilisateur lui-meme en six semaines.
--
--  Les categories `mobilite` et `renforcement` ne promettent RIEN sur
--  la taille et leur `benefice` le dit en toutes lettres. Elles
--  meritent leur place : sans amplitude articulaire ni gainage, la
--  correction posturale ne tient pas.
--
--  Regle pour qui ajoutera un exercice : si le benefice ne rentre dans
--  aucun des quatre cadres ci-dessus, l exercice n entre pas.
--
--  Sans risque : IF NOT EXISTS, ON CONFLICT DO UPDATE. Relancer met a
--  jour les libelles sans dupliquer ni perdre les seances deja faites
--  (elles vivent dans task_completions, sous la cle exercice-<slug>).
-- ============================================================


-- ---------- Le cycle de sept jours ----------
--
-- Un exercice peut revenir plusieurs jours : `jours` porte les numeros
-- ISO (1 = lundi ... 7 = dimanche) ou il est programme.
--
-- Un tableau plutot qu une table de liaison : la question posee est
-- toujours « que fait-on aujourd hui », jamais « quels jours pour cet
-- exercice ». Une jointure pour repondre a une question qu on ne pose
-- pas est une jointure de trop.
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS jours smallint[] NOT NULL DEFAULT '{}';

-- L index GIN sert l operateur de recouvrement (`jours && ARRAY[3]`),
-- qui est exactement la requete du plan du jour.
CREATE INDEX IF NOT EXISTS exercices_jours_idx ON exercices USING GIN (jours);


-- ============================================================
--  CONTENU
-- ============================================================
--
-- Six exercices par jour, environ cinq minutes de seance. Ce n est pas
-- un compromis : c est la duree qu un adolescent refait le lendemain.
-- Une seance de vingt minutes se fait deux fois puis s abandonne, et un
-- programme abandonne vaut zero quelle que soit sa qualite.

INSERT INTO exercices (slug, nom_fr, consigne_fr, categorie, benefice, duree_sec, ordre, jours) VALUES

-- ---------- Decompression ----------
('suspension-barre', 'Suspension à la barre',
 'Attrape une barre, mains écartées de la largeur des épaules. Laisse tout le poids du corps tirer vers le bas, épaules relâchées. Respire normalement.',
 'decompression',
 'Rend une partie du centimètre perdu dans la journée. L''effet est réel et se reprend chaque jour — il ne change pas ta taille adulte.',
 30, 10, '{1,2,3,4,5,6,7}'),

('suspension-porte', 'Suspension au chambranle',
 'Pas de barre ? Agrippe le haut d''un chambranle solide, fléchis les genoux pour que les pieds ne touchent plus. Même consigne : épaules relâchées.',
 'decompression',
 'Même effet que la suspension à la barre, pour qui n''en a pas.',
 30, 11, '{6}'),

('chien-tete-en-bas', 'Chien tête en bas',
 'À quatre pattes, pousse les hanches vers le plafond pour former un V inversé. Talons vers le sol, dos long. Ne cherche pas à poser les talons de force.',
 'decompression',
 'Étire la chaîne postérieure et allonge la colonne. Aucun effet sur la taille adulte.',
 45, 12, '{3,7}'),

('posture-enfant', 'Posture de l''enfant',
 'À genoux, fesses sur les talons, bras tendus loin devant, front au sol. Laisse la cage thoracique s''ouvrir à chaque expiration.',
 'decompression',
 'Relâche les muscles qui tassent la colonne. Effet quotidien, pas durable.',
 45, 13, '{4}'),

-- ---------- Posture ----------
('anges-au-mur', 'Anges au mur',
 'Dos au mur, talons à 10 cm. Colle la tête, le haut du dos et les fesses au mur. Bras en W, puis monte-les lentement en Y sans décoller les poignets.',
 'posture',
 'Le plus utile de la liste. Rouvre une cage thoracique fermée : c''est ce qui récupère des centimètres de taille MESURÉE, durablement, chez qui est voûté.',
 90, 20, '{1,2,3,4,5,6,7}'),

('retraction-menton', 'Rétraction du menton',
 'Assis ou debout, regard droit. Recule la tête à l''horizontale, comme pour faire un double menton. Sans lever ni baisser le menton. Tiens 5 s, relâche.',
 'posture',
 'Corrige la tête portée en avant, qui coûte plusieurs millimètres de taille debout et se voit sur toutes les photos.',
 60, 21, '{1,5}'),

('etirement-pectoraux', 'Ouverture des pectoraux',
 'Avant-bras contre un chambranle, coude à hauteur d''épaule. Avance d''un pas et tourne le buste à l''opposé. Change de côté à mi-temps.',
 'posture',
 'Des pectoraux courts tirent les épaules vers l''avant et ferment la poitrine. Les rallonger laisse le dos se redresser.',
 60, 22, '{2,6}'),

('cobra', 'Cobra',
 'À plat ventre, mains sous les épaules. Décolle le buste en gardant le bassin au sol. Épaules basses, loin des oreilles. Ne force pas dans le bas du dos.',
 'posture',
 'Travaille l''extension thoracique, celle qui manque à une colonne voûtée.',
 45, 23, '{1,4}'),

('pont-fessier', 'Pont fessier',
 'Sur le dos, genoux fléchis, pieds à plat. Décolle le bassin en serrant les fessiers. Épaules au sol, pas de cambrure forcée.',
 'posture',
 'Réveille les fessiers. Endormis, ils laissent le bassin basculer vers l''avant et la silhouette se tasser.',
 45, 24, '{3,5}'),

-- ---------- Mobilite ----------
('chat-vache', 'Chat-vache',
 'À quatre pattes. Inspire en creusant le dos et en levant le regard, expire en arrondissant et en rentrant le menton. Lentement, vertèbre par vertèbre.',
 'mobilite',
 'Entretient la mobilité de chaque vertèbre. Aucun effet sur la taille : c''est ce qui rend les exercices de posture possibles.',
 60, 30, '{1,2,3,4,5,6,7}'),

('etirement-figure-4', 'Étirement en figure 4',
 'Sur le dos, cheville droite sur le genou gauche. Attrape la cuisse gauche et ramène vers toi. Change de côté à mi-temps.',
 'mobilite',
 'Détend les fessiers profonds, qui bloquent le bassin. Aucun effet sur la taille.',
 45, 31, '{2}'),

('etirement-psoas', 'Étirement du psoas',
 'En fente, genou arrière au sol. Rentre le bassin sous toi puis avance légèrement. Tu dois sentir l''avant de la hanche arrière. Change de côté.',
 'mobilite',
 'Un psoas court bascule le bassin vers l''avant et creuse le bas du dos. Le rallonger laisse le buste se redresser.',
 60, 32, '{3,7}'),

('rotation-thoracique', 'Rotation thoracique allongée',
 'Sur le côté, genoux repliés à 90°. Ouvre le bras du dessus vers l''arrière en suivant la main du regard. Laisse la cage thoracique tourner.',
 'mobilite',
 'Redonne de la rotation au haut du dos. Aucun effet sur la taille.',
 60, 33, '{4,7}'),

-- ---------- Renforcement ----------
('planche', 'Planche',
 'Appuis sur les avant-bras et la pointe des pieds. Corps en ligne droite des talons à la tête. Ventre serré, fesses ni hautes ni basses.',
 'renforcement',
 'Un centre solide tient la posture sans y penser. Sans lui, le dos se réaffaisse dès que l''attention retombe.',
 45, 40, '{1,5}'),

('superman', 'Superman',
 'À plat ventre, bras devant. Décolle en même temps les bras, la poitrine et les jambes. Tiens 3 s, repose. Regard vers le sol, nuque longue.',
 'renforcement',
 'Renforce les muscles du dos qui te tiennent droit toute la journée.',
 45, 41, '{2,6}')

ON CONFLICT (slug) DO UPDATE SET
    nom_fr      = EXCLUDED.nom_fr,
    consigne_fr = EXCLUDED.consigne_fr,
    categorie   = EXCLUDED.categorie,
    benefice    = EXCLUDED.benefice,
    duree_sec   = EXCLUDED.duree_sec,
    ordre       = EXCLUDED.ordre,
    jours       = EXCLUDED.jours;


-- ============================================================
--  VERIFICATION
-- ============================================================
--  Chaque jour du cycle doit porter six exercices. Un jour a cinq ou a
--  sept passerait inapercu a la lecture du INSERT ; pas ici.

SELECT   j AS jour_iso,
         count(*) AS nb_exercices,
         sum(duree_sec) AS duree_totale_sec
FROM     generate_series(1, 7) AS j
JOIN     exercices e ON e.jours && ARRAY[j]::smallint[]
WHERE    e.actif
GROUP BY j
ORDER BY j;
