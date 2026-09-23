-- ============================================================
--  COMMUNAUTE, EN LECTURE SEULE
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  POURQUOI PAS UN FORUM
--
--  Un fil ouvert entre mineurs impose une moderation, un dispositif de
--  signalement et une politique de retention — et le DSA ajoute des
--  obligations propres des qu un service est accessible aux mineurs.
--  Rien d autre dans ce produit n impose cela. Un forum non modere sur
--  une application qui parle de taille a des adolescents devient un
--  endroit ou l on se compare et ou l on se moque, et ce risque-la ne
--  se repare pas apres coup.
--
--  Ce qui est livre ici : un fil que L EQUIPE ecrit, que les
--  utilisateurs lisent, et dont les non-lus font une pastille. Toute la
--  valeur d information du forum, aucun de ses couts.
--
--  Le jour ou l on ouvrira l ecriture, il faudra AVANT : un bouton de
--  signalement, une file de moderation, une regle de retention ecrite,
--  et quelqu un dont c est le travail. Pas apres.
--
--  SUR LE CONTENU : les memes regles que partout ailleurs. Aucune
--  publication ne promet de centimetres, la posture exceptee — seul
--  levier dont l effet sur la taille MESUREE est reel. Les publications
--  qui disent « non » sont volontairement majoritaires : ce sont celles
--  qu un adolescent ne trouvera nulle part ailleurs, parce qu elles ne
--  vendent rien.
-- ============================================================

CREATE TABLE IF NOT EXISTS publications (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text        NOT NULL UNIQUE,
    titre       text        NOT NULL,
    corps       text        NOT NULL,

    -- 'reponse'  : une question qu on nous pose vraiment
    -- 'demontage': une idee repandue et fausse
    -- 'methode'  : comment se servir de l application
    categorie   text        NOT NULL DEFAULT 'reponse'
                            CHECK (categorie IN ('reponse', 'demontage', 'methode')),

    -- Le niveau de preuve, AFFICHE a l ecran. Une application de sante
    -- qui ne distingue pas « etabli » de « plausible » demande qu on la
    -- croie sur parole, et c est exactement ce qu on reproche au reste
    -- du marche.
    preuve      text        NOT NULL DEFAULT 'etabli'
                            CHECK (preuve IN ('etabli', 'probable', 'incertain')),

    publie_le   date        NOT NULL DEFAULT current_date,
    epingle     boolean     NOT NULL DEFAULT false,
    actif       boolean     NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS publications_ordre_idx
    ON publications (actif, epingle DESC, publie_le DESC);


-- Ce que chacun a deja lu. Une ligne par publication ouverte.
--
-- Pas de colonne « lu » sur publications : elle est partagee par tout le
-- monde, et le premier lecteur marquerait la publication lue pour tous.
CREATE TABLE IF NOT EXISTS lectures (
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    lu_le          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, publication_id)
);

ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  CONTENU
-- ============================================================

INSERT INTO publications (slug, titre, corps, categorie, preuve, epingle, publie_le) VALUES

('plaques-de-croissance',
 'Jusqu''à quel âge peut-on encore grandir ?',
 'La croissance s''arrête à la fusion des plaques de croissance, les zones de cartilage au bout des os longs. Une fois fermées, plus rien ne les rouvre : ni étirement, ni complément, ni entraînement.

Elles se ferment en moyenne vers 16 ans chez les filles et 18 ans chez les garçons, mais la moyenne ne dit rien de ton cas. La seule façon de savoir où tu en es, c''est une radiographie de la main et du poignet gauche — c''est ce qu''on appelle l''âge osseux, et un médecin peut la demander.

Ce que ça change pour toi : tant que tes plaques sont ouvertes, tout ce qui suit a un intérêt. Une fois fermées, seule la posture peut encore faire une différence sur ta taille mesurée.',
 'reponse', 'etabli', true, '2026-09-01'),

('etirements-taille',
 'Les étirements font-ils grandir ?',
 'Non. Aucun essai contrôlé ne montre qu''un étirement, une suspension ou une posture augmente la taille adulte.

Deux effets réels existent, et ce sont les seuls :

La décompression. Tu perds 1 à 1,5 cm entre le lever et le coucher : les disques entre tes vertèbres se tassent sous le poids du corps. Une suspension ou un chien tête en bas en rend une partie. C''est vrai, ça se reprend chaque jour, et ça ne change pas d''un millimètre ta taille finale.

La posture. Si tu es voûté, tu perds de la taille debout. Pas de la croissance — de la taille mesurée. La corriger en récupère 1 à 3 cm chez quelqu''un qui en a besoin, et ceux-là sont durables. C''est vérifiable : mesure-toi aujourd''hui, refais six semaines d''anges au mur, remesure.

C''est pour ça que le programme contient des exercices, et pour ça qu''on ne te promet pas qu''ils te feront grandir.',
 'demontage', 'etabli', true, '2026-09-02'),

('genetique-part',
 'Quelle part vient de mes parents ?',
 'Environ 80 %. C''est ce que donnent les études de jumeaux, et les analyses génétiques récentes ont identifié plus de 5 000 variants qui expliquent à eux seuls près de la moitié des différences de taille entre individus.

Ça laisse une marge, et c''est cette marge que tu peux travailler. Mais sois honnête sur sa taille : chez un adolescent déjà bien nourri, qui dort correctement et n''a pas de maladie, elle se compte en quelques centimètres au mieux — pas en dizaines.

Ce que personne ne te dira dans une publicité : l''essentiel de ce que tu peux gagner, c''est de ne pas PERDRE. Éviter le tabac, l''alcool, les régimes trop stricts, les stéroïdes, et faire soigner ce qui doit l''être.',
 'reponse', 'etabli', false, '2026-09-03'),

('sommeil-croissance',
 'Est-ce que dormir plus me fera grandir ?',
 'Ce qui est établi : la majorité de l''hormone de croissance est sécrétée pendant le sommeil profond, et une privation de sommeil sévère et durable freine la croissance.

Ce qui ne l''est pas : qu''ajouter une heure à quelqu''un qui dort déjà huit heures le fasse grandir. Personne ne l''a montré.

La bonne façon de le lire : le sommeil n''est pas un levier qui pousse, c''est un plancher à ne pas casser. Entre 8 et 10 heures, tu es dans la plage. En dessous de 6 heures toutes les nuits pendant des mois, tu perds quelque chose.

Ne vise pas à dépasser la plage. Vise à y être.',
 'demontage', 'probable', false, '2026-09-05'),

('proteines-combien',
 'Combien de protéines par jour ?',
 'Autour de 1,2 à 1,5 g par kilo de ton poids. Pour 55 kg, ça fait 66 à 83 g par jour.

Les applications qui affichent 150 g à tout le monde se trompent de personne : c''est un objectif de culturiste de 110 kg. À 45 kg, c''est plus du triple de ton besoin, et un objectif inatteignable ne motive pas — il fait abandonner le suivi au bout d''une semaine.

L''écart réel chez la plupart des adolescents n''est pas énorme, mais il existe : souvent un petit-déjeuner sans rien de protéiné. Un yaourt, deux œufs ou du fromage blanc le matin suffisent à le combler.

Au-delà de ton besoin, le surplus ne sert à rien de plus. Il n''y a pas de bonus.',
 'reponse', 'etabli', false, '2026-09-08'),

('complements-alimentaires',
 'Les compléments font-ils grandir ?',
 'Seulement s''il te manque quelque chose. C''est toute la réponse, et elle est plus utile qu''elle n''en a l''air.

La vitamine D corrige une carence ; chez quelqu''un qui n''en a pas, en prendre plus ne fait rien. Le zinc augmente la vitesse de croissance chez des enfants réellement carencés ; ailleurs, non. Le calcium renforce l''os sans qu''aucune étude ne montre d''effet sur la taille adulte.

Donc : ce n''est pas « est-ce que ça marche », c''est « est-ce qu''il me manque ». Et ça, ni nous ni une boîte de gélules ne pouvons le dire — c''est une prise de sang.

Méfie-toi de tout produit vendu comme faisant grandir. Il n''en existe aucun.',
 'demontage', 'etabli', false, '2026-09-10'),

('quand-consulter',
 'Quand faut-il en parler à un médecin ?',
 'C''est la publication la plus importante de ce fil, et c''est celle qui ne rapporte rien à personne.

Parles-en à un médecin si :
— tu grandis de moins de 4 à 5 cm par an avant ta puberté ;
— ta courbe descend d''un couloir à l''autre sur le carnet de santé ;
— tu es nettement plus petit que ce que laissent attendre les tailles de tes parents ;
— tu es une fille de 13 ans sans aucun signe de puberté ;
— tu es souvent fatigué, tu digères mal, ou tu as une anémie inexpliquée.

Plusieurs causes de petite taille se soignent — maladie cœliaque, hypothyroïdie, déficit en hormone de croissance, syndrome de Turner. Elles ont un point commun : le traitement ne marche que TANT QUE les plaques de croissance sont ouvertes. Attendre coûte des centimètres qu''on ne rattrape pas.

Aucune application ne remplace cette consultation. La nôtre non plus.',
 'methode', 'etabli', true, '2026-09-12'),

('pourquoi-une-fois-par-semaine',
 'Pourquoi je ne peux me mesurer qu''une fois par semaine ?',
 'Parce qu''au-delà, tu n''enregistres plus que l''erreur de mesure.

Un adolescent en pleine poussée prend 8 à 10 cm par an, soit un peu plus d''un millimètre par semaine. Une mesure faite au mur, même bien faite, est précise à 4 mm près au mieux. Sur sept jours, l''erreur est donc trois fois plus grande que ce que tu cherches à voir.

Concrètement : si tu te mesures tous les jours, tu verras des jours où tu as « perdu » un centimètre. Tu ne l''as pas perdu — tu t''es mesuré le soir, ou le menton un peu levé.

Une fois par semaine, toujours au réveil, toujours de la même façon : c''est la seule cadence où la courbe veut dire quelque chose.',
 'methode', 'etabli', false, '2026-09-15')

ON CONFLICT (slug) DO UPDATE SET
    titre = EXCLUDED.titre, corps = EXCLUDED.corps,
    categorie = EXCLUDED.categorie, preuve = EXCLUDED.preuve,
    epingle = EXCLUDED.epingle;


-- ============================================================
--  VERIFICATION
-- ============================================================

SELECT   categorie, preuve, count(*) AS nb
FROM     publications WHERE actif
GROUP BY categorie, preuve
ORDER BY categorie, preuve;
