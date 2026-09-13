-- ============================================================
--  SAVOIR OU LES GENS S ARRETENT
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  POURQUOI
--  Le site est une application d une seule page : l adresse reste
--  toujours "grandimi.com/", meme quand le visiteur avance dans les
--  14 ecrans du questionnaire. Consequence, verifiee le 13/09/2026
--  dans le tableau de bord Whop : les 131 vues de grandimi.com y sont
--  toutes comptees sur la meme page "/". Whop sait donc QUI arrive,
--  jamais OU il s arrete.
--
--  L instrumentation PostHog pose deja les bons evenements, mais elle
--  n est lisible qu en se connectant a PostHog. Cette table est la
--  meme mesure, chez nous, lisible en SQL depuis cet editeur.
--
--  CE QU ON N ECRIT JAMAIS ICI
--  Le produit mesure des enfants. Cette table ne porte AUCUNE taille,
--  aucun poids, aucune date de naissance, aucune adresse e-mail, et
--  aucune taille de parent. Elle ne contient que le nom d un ecran et
--  un identifiant de session tire au hasard dans le navigateur. Elle
--  est volontairement incapable de decrire une personne.
--
--  Sans risque : IF NOT EXISTS, aucune donnee existante touchee.

CREATE TABLE IF NOT EXISTS evenements_tunnel (
    id         bigserial   PRIMARY KEY,

    -- Identifiant tire au hasard dans le navigateur, sans aucun lien
    -- avec un compte. Sert uniquement a relier les etapes d une meme
    -- visite pour pouvoir compter des visiteurs et pas des clics.
    session    text        NOT NULL,

    -- Nom d evenement. La liste est FERMEE cote serveur
    -- (internal/api/tunnel_handlers.go) : la route est publique, donc
    -- sans liste fermee cette table deviendrait un espace de stockage
    -- gratuit ouvert a tous.
    evenement  text        NOT NULL,

    -- Pour tunnel_etape_vue : quel ecran du questionnaire.
    etape      text        NOT NULL DEFAULT '',

    -- Sa position, de 1 a 14. C est ce nombre qui trace la courbe de
    -- decrochage.
    rang       int         NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evenements_tunnel_evenement_idx
    ON evenements_tunnel (evenement, created_at);
CREATE INDEX IF NOT EXISTS evenements_tunnel_session_idx
    ON evenements_tunnel (session);

-- Row Level Security ACTIVEE, sans aucune politique.
--
-- Supabase publie les tables du schema public via son API REST : sans
-- RLS, n importe qui pourrait lire cette table avec la cle anon, ou y
-- injecter des lignes pour fausser la mesure. Aucune politique n est
-- creee : personne ne passe par PostgREST. Le backend se connecte en
-- direct via DATABASE_URL avec un role qui contourne RLS.
ALTER TABLE evenements_tunnel ENABLE ROW LEVEL SECURITY;

-- ---------- Verification ----------
SELECT 'table_evenements_tunnel' AS objet, count(*)::text AS valeur
FROM   information_schema.tables
WHERE  table_name = 'evenements_tunnel';
