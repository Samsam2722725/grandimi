-- ============================================================
--  CE QU ON MESURE, ET CE QU ON N A JAMAIS MESURE
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  POURQUOI
--  L application sait predire une taille et cocher des taches. Elle ne
--  garde AUCUNE mesure dans le temps. Consequence : la prediction du
--  jour 1 est encore celle du jour 300, parce que rien n est revenu
--  l alimenter, et on ne peut afficher ni courbe, ni vitesse de
--  croissance, ni « il te reste X ans de croissance ».
--
--  C est aussi la seule chose qu un concurrent ne peut pas copier. Une
--  application se reecrit en six semaines ; des trajectoires de
--  croissance mesurees chez de vrais adolescents, non. Ces tables sont
--  le fosse defensif, tout le reste est du decor.
--
--  CE QUE CETTE MIGRATION NE FAIT PAS
--  Elle ne touche a aucune table existante, n en supprime aucune, ne
--  modifie aucune colonne. IF NOT EXISTS partout : la relancer deux
--  fois ne coute rien.
--
--  RLS ACTIVEE, AUCUNE POLITIQUE — c est deliberé et c est la
--  convention du depot (cf. 009_preferences_plan.sql). Supabase publie
--  le schema public via PostgREST : sans RLS, ces mesures seraient
--  lisibles avec la cle anon, qui est dans le bundle JavaScript. Aucune
--  politique n est creee parce que personne ne passe par PostgREST — le
--  backend Go se connecte via DATABASE_URL avec un role qui contourne
--  RLS. Ajouter des politiques ici donnerait l illusion d un acces
--  client qui n existe pas.
--
--  Ce sont des donnees de sante de mineurs (RGPD art. 9). La regle
--  qui en decoule et qui se voit dans le schema : on enregistre ce qui
--  sert a calculer une courbe, rien de plus. Aucun stade de Tanner,
--  aucune photo, aucun texte libre.
-- ============================================================


-- ============================================================
--  1. MESURES DE TAILLE
-- ============================================================
--
--  La table qui compte. Tout le reste en decoule.
--
--  Le goulot d etranglement n est pas le modele, c est la MESURE. Un
--  stadiometre clinique a un ecart-type de 0,2 a 0,3 cm ; une mesure
--  faite au mur avec un livre sur la tete est facilement a 1 cm pres.
--  Sur six mois d intervalle, 1 cm d erreur donne pres de 3 cm/an
--  d erreur sur la vitesse de croissance — or la vitesse est justement
--  le seul signal qui vaille quelque chose. D ou les trois colonnes qui
--  suivent, qui n existent dans aucune application concurrente.

CREATE TABLE IF NOT EXISTS height_logs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Date de la mesure, pas de l enregistrement. Quelqu un qui saisit
    -- dimanche soir la mesure de samedi matin doit pouvoir le dire,
    -- sinon la vitesse se calcule sur le mauvais intervalle.
    mesure_le   date        NOT NULL,

    -- La valeur retenue : la MEDIANE de mesures_brutes, pas leur
    -- moyenne. Une mesure ratee (talons decolles, menton leve) tire une
    -- moyenne de plusieurs millimetres ; elle ne deplace pas une
    -- mediane de trois valeurs.
    taille_cm   numeric(5,2) NOT NULL CHECK (taille_cm > 50 AND taille_cm < 260),

    -- Les trois mesures d origine, gardees telles quelles.
    --
    -- Deux raisons, et la seconde vaut plus que la premiere :
    --   1. Leur dispersion dit si la mesure est fiable. Trois valeurs a
    --      0,2 cm d ecart valent une mesure ; trois valeurs a 1,5 cm
    --      d ecart ne valent rien et il faut le dire a l utilisateur.
    --   2. Le jour ou l on calibrera un modele sur ces donnees, on aura
    --      besoin de l erreur de mesure reelle. Elle ne se reconstitue
    --      pas apres coup si on n a garde que la mediane.
    mesures_brutes numeric(5,2)[] NOT NULL DEFAULT '{}',

    -- 'matin' ou 'soir'. On perd 1,1 a 1,5 cm entre le lever et le
    -- coucher, par compression des disques intervertebraux. Comparer
    -- une mesure du matin a une mesure du soir fabrique une perte de
    -- taille qui n existe pas. Le protocole demande le matin ; cette
    -- colonne permet d ecarter ou de corriger les autres.
    moment      text        NOT NULL DEFAULT 'matin'
                            CHECK (moment IN ('matin', 'soir', 'inconnu')),

    -- 'guide' (protocole en 3 mesures suivi dans l app) ou 'saisie'
    -- (chiffre tape a la main, origine inconnue). Les deux n ont pas la
    -- meme valeur et ne doivent pas peser pareil dans une courbe.
    source      text        NOT NULL DEFAULT 'saisie'
                            CHECK (source IN ('guide', 'saisie', 'import')),

    cree_le     timestamptz NOT NULL DEFAULT now(),

    -- Une mesure par jour et par personne. Le deverrouillage
    -- hebdomadaire est une regle d application, pas une regle de base :
    -- l interdire ici bloquerait une correction de saisie le lendemain.
    UNIQUE (user_id, mesure_le)
);

-- L acces type est « les N dernieres mesures de cette personne, de la
-- plus recente a la plus ancienne » : courbe, vitesse, compte a rebours
-- du prochain deverrouillage. L index porte donc le tri dans le bon
-- sens, sinon Postgres relit et retrie a chaque ouverture de l accueil.
CREATE INDEX IF NOT EXISTS height_logs_user_date_idx
    ON height_logs (user_id, mesure_le DESC);

ALTER TABLE height_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  2. SOMMEIL
-- ============================================================
--
--  La majorite de la secretion d hormone de croissance est pulsatile et
--  survient en sommeil lent. Ce qui est etabli : une privation severe
--  et chronique altere la croissance. Ce qui ne l est PAS : qu ajouter
--  une heure a un adolescent qui dort deja 8 h le fasse grandir.
--
--  Le schema reflete cette nuance : on enregistre une duree, pas une
--  promesse. Ce qui s affiche a l ecran doit rester au meme niveau de
--  prudence.

CREATE TABLE IF NOT EXISTS sleep_logs (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- La nuit est rattachee au jour du REVEIL. Une nuit a cheval sur
    -- deux dates se compte sinon deux fois, ou zero.
    jour      date        NOT NULL,

    -- 24 h exactement est refuse : c est la valeur qu on obtient quand
    -- un selecteur part en butee, jamais une nuit reelle.
    heures    numeric(4,2) NOT NULL CHECK (heures > 0 AND heures < 24),

    cree_le   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, jour)
);

CREATE INDEX IF NOT EXISTS sleep_logs_user_jour_idx
    ON sleep_logs (user_id, jour DESC);

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  3. ALIMENTS
-- ============================================================
--
--  Table de reference partagee, pas de donnees personnelles : aucune
--  colonne user_id, aucune RLS a activer. Elle sera remplie depuis la
--  table Ciqual de l ANSES (valeurs francaises, reutilisables).
--
--  Les quatre nutriments retenus, et pourquoi ceux-la :
--    proteines — le seul macro dont un deficit reel freine la croissance
--    calcium   — mineralisation osseuse (aucun effet demontre sur la
--                taille adulte, effet reel sur la densite)
--    vitamine D— effet sur la taille UNIQUEMENT en cas de carence
--    energie   — un deficit energetique chronique arrete la croissance
--                avant que le moindre micronutriment n entre en jeu
--
--  Tout le reste (zinc, fer, iode) compte aussi, mais seulement en
--  population carencee et ne se suit pas avec un journal alimentaire
--  declaratif. Les ajouter ici donnerait une precision fictive.

CREATE TABLE IF NOT EXISTS aliments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiant stable et lisible ('yaourt-nature', 'oeuf-dur'). Sert
    -- de cle de re-import : reimporter Ciqual met a jour au lieu de
    -- dupliquer.
    slug        text        NOT NULL UNIQUE,
    nom_fr      text        NOT NULL,

    -- Toutes les valeurs POUR 100 g, sans exception. Melanger « pour
    -- 100 g » et « par portion » dans la meme colonne est l erreur
    -- classique de ce genre de table, et elle ne se voit qu au moment
    -- ou un total est trois fois trop grand.
    kcal        numeric(7,2) NOT NULL DEFAULT 0,
    proteines_g numeric(7,2) NOT NULL DEFAULT 0,
    calcium_mg  numeric(8,2) NOT NULL DEFAULT 0,
    vit_d_ui    numeric(8,2) NOT NULL DEFAULT 0,

    -- Portion usuelle en grammes, pour proposer « 1 yaourt = 125 g »
    -- plutot que de faire taper un poids. NULL quand elle n a pas de
    -- sens (huile, epices).
    portion_g   numeric(7,2),

    categorie   text        NOT NULL DEFAULT 'autre',
    cree_le     timestamptz NOT NULL DEFAULT now()
);

-- Recherche par nom dans le selecteur d aliments. `text_pattern_ops`
-- sert les prefixes ('yaou%'), qui est la facon dont on tape dans un
-- champ de recherche.
CREATE INDEX IF NOT EXISTS aliments_nom_idx
    ON aliments (lower(nom_fr) text_pattern_ops);


-- ============================================================
--  4. REPAS
-- ============================================================
--
--  Plusieurs lignes par jour, donc PAS de contrainte d unicite sur la
--  date : c est la difference avec sleep_logs et height_logs.

CREATE TABLE IF NOT EXISTS meal_logs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jour        date        NOT NULL,

    moment      text        NOT NULL DEFAULT 'autre'
                            CHECK (moment IN ('petit-dej', 'dejeuner', 'gouter', 'diner', 'autre')),

    -- Reference a la table de correspondance, gardee a titre indicatif.
    -- ON DELETE SET NULL et non CASCADE : retirer un aliment du
    -- catalogue ne doit pas effacer l historique de quelqu un.
    aliment_id  uuid        REFERENCES aliments(id) ON DELETE SET NULL,

    -- Le libelle et les valeurs sont RECOPIES, pas seulement references.
    --
    -- Ce n est pas de la redondance : corriger une fiche Ciqual dans six
    -- mois reecrirait retroactivement des journees deja enregistrees, et
    -- une courbe de nutrition qui change toute seule dans le passe est
    -- une courbe a laquelle personne ne fait plus confiance. On fige ce
    -- qui a ete compte le jour ou il a ete compte.
    libelle     text        NOT NULL,
    quantite_g  numeric(7,2) NOT NULL DEFAULT 0,
    kcal        numeric(7,2) NOT NULL DEFAULT 0,
    proteines_g numeric(7,2) NOT NULL DEFAULT 0,
    calcium_mg  numeric(8,2) NOT NULL DEFAULT 0,
    vit_d_ui    numeric(8,2) NOT NULL DEFAULT 0,

    cree_le     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_logs_user_jour_idx
    ON meal_logs (user_id, jour DESC);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  5. OBJECTIFS NUTRITIONNELS
-- ============================================================
--
--  Une ligne par personne. Les valeurs sont CALCULEES a la creation
--  (poids, age, sexe, activite) puis modifiables a la main.
--
--  Elles sont stockees plutot que recalculees a chaque affichage pour
--  une raison precise : un objectif qui change tout seul parce que
--  l utilisateur a mis a jour son poids fait bouger le pourcentage
--  d hier. Un objectif est un engagement, il se met a jour quand on le
--  decide, pas quand une autre donnee bouge.
--
--  Les valeurs par defaut ci-dessous sont des PLACEHOLDERS de schema,
--  pas des recommandations : le code qui cree la ligne doit calculer
--  les proteines a environ 1,2-1,5 g par kg de poids. Un objectif fixe
--  de 150 g — ce qu affiche le concurrent a tout le monde — convient a
--  quelqu un de 110 kg et represente le triple du besoin d une fille de
--  45 kg.

CREATE TABLE IF NOT EXISTS nutrition_targets (
    user_id     uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    kcal        int         NOT NULL DEFAULT 2200 CHECK (kcal BETWEEN 800 AND 6000),
    proteines_g int         NOT NULL DEFAULT 70   CHECK (proteines_g BETWEEN 10 AND 300),

    -- 1300 mg : apport de reference pour les 9-18 ans, celui-la ne
    -- depend pas du poids.
    calcium_mg  int         NOT NULL DEFAULT 1300 CHECK (calcium_mg BETWEEN 200 AND 3000),

    -- 600 UI = 15 µg. Au-dela de 4000 UI/j, la supplementation devient
    -- un risque et non un benefice : le plafond est dans la contrainte.
    vit_d_ui    int         NOT NULL DEFAULT 600  CHECK (vit_d_ui BETWEEN 0 AND 4000),

    -- true des que l utilisateur a touche une valeur : le recalcul
    -- automatique ne doit plus ecraser un choix explicite.
    ajuste_main boolean     NOT NULL DEFAULT false,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  6. BIBLIOTHEQUE D EXERCICES
-- ============================================================
--
--  Contenu partage, aucune donnee personnelle, donc pas de RLS.
--
--  SUR LA PROMESSE ATTACHEE A CES EXERCICES — a lire avant d ecrire le
--  moindre libelle dans `benefice`. Aucun essai controle ne montre
--  qu un etirement ou une suspension augmente la taille ADULTE. Deux
--  effets reels existent et sont les seuls qu on ait le droit
--  d annoncer :
--    - la decompression discale rend une partie du centimetre perdu
--      dans la journee (reversible, quotidien, sans effet sur la taille
--      finale) ;
--    - la correction d une cyphose ou d une antéversion du bassin
--      recupere 1 a 3 cm de taille MESUREE chez qui en a une, et
--      celle-la est durable.
--  La colonne `benefice` existe pour forcer a ecrire lequel des deux
--  s applique, exercice par exercice, plutot que de laisser une
--  promesse vague couvrir tout l ecran.

CREATE TABLE IF NOT EXISTS exercices (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cle stable citee par le planificateur Go. Renommer le libelle
    -- francais ne doit pas casser les plans deja generes.
    slug        text        NOT NULL UNIQUE,

    nom_fr      text        NOT NULL,
    consigne_fr text        NOT NULL DEFAULT '',

    -- 'posture' | 'decompression' | 'mobilite' | 'renforcement'.
    -- Determine ce qu on a le droit de promettre (cf. ci-dessus).
    categorie   text        NOT NULL DEFAULT 'mobilite'
                            CHECK (categorie IN ('posture', 'decompression', 'mobilite', 'renforcement')),

    -- Le benefice REEL, en une phrase verifiable par l utilisateur.
    benefice    text        NOT NULL DEFAULT '',

    duree_sec   int         NOT NULL DEFAULT 45 CHECK (duree_sec BETWEEN 5 AND 1800),
    media_url   text,
    ordre       int         NOT NULL DEFAULT 0,
    actif       boolean     NOT NULL DEFAULT true,
    cree_le     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercices_ordre_idx ON exercices (actif, ordre);


-- ============================================================
--  7. CONNEXIONS QUOTIDIENNES
-- ============================================================
--
--  Une ligne par jour d ouverture. C est la source de la « serie de
--  connexions » affichee sur l accueil.
--
--  Pas de table `streaks` avec un compteur.
--
--  Un compteur denormalise derive : il se desynchronise au premier
--  fuseau horaire mal gere, a la premiere double ecriture, au premier
--  rejeu de webhook — et une serie qui se remet a zero toute seule est
--  precisement ce qui fait desinstaller une application de suivi. La
--  serie courante et le record se CALCULENT a partir de ces lignes.
--  Sept jours a inspecter pour l affichage courant, quelques centaines
--  au maximum pour le record : ce n est pas un cout.

CREATE TABLE IF NOT EXISTS connexions (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Jour LOCAL de l utilisateur, calcule cote application. Une date
    -- UTC fait changer de jour a 2 h du matin en France l ete : la
    -- serie casse pour quelqu un qui ouvre l application tard le soir.
    jour    date NOT NULL,

    PRIMARY KEY (user_id, jour)
);

ALTER TABLE connexions ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  CE QU ON N A VOLONTAIREMENT PAS CREE
-- ============================================================
--
--  `exercise_completions` : un exercice fait EST une tache faite.
--  task_completions (user_id, task_date, task_key) porte deja
--  exactement cette information ; il suffit d y ecrire la cle
--  'exercice-<slug>'. Une seconde table de completion aurait impose de
--  tenir deux compteurs de progression coherents entre eux, pour ne
--  rien enregistrer de plus qu un booleen.
--
--  `streaks` : voir la section 7.
--
--  Les deux figuraient dans le plan annonce. Les ecrire aurait ete
--  suivre le plan ; ne pas les ecrire est ce que le plan cherchait.


-- ============================================================
--  VERIFICATION
-- ============================================================
--  Doit renvoyer 7 lignes, une par objet cree.

--  `pg_tables` et non `information_schema.tables` : la norme SQL ne
--  connait pas la securite au niveau ligne, cette vue n a donc aucune
--  colonne qui la decrive. Seul le catalogue Postgres l expose.

SELECT   tablename AS objet,
         CASE WHEN rowsecurity THEN 'RLS activee' ELSE 'table de reference' END AS etat
FROM     pg_tables
WHERE    schemaname = 'public'
  AND    tablename IN ('height_logs', 'sleep_logs', 'aliments', 'meal_logs',
                       'nutrition_targets', 'exercices', 'connexions')
ORDER BY tablename;
