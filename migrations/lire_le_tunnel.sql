-- ============================================================
--  OU LES GENS S ARRETENT
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  Ne modifie rien : trois lectures, aucune ecriture.
--  Demande d abord migrations/008_tunnel.sql.
--
--  On compte des SESSIONS DISTINCTES et non des lignes : un visiteur
--  qui revient en arriere puis repart en avant revoit le meme ecran
--  deux fois, et compterait double.


-- ---------- 1. La courbe de decrochage, ecran par ecran ----------
--
--  La colonne "restants" est le pourcentage de ceux qui ont vu le
--  premier ecran. La ligne ou elle chute d un coup est la reponse.

WITH vues AS (
    SELECT rang, etape, count(DISTINCT session) AS visiteurs
    FROM   evenements_tunnel
    WHERE  evenement = 'tunnel_etape_vue'
      AND  created_at > now() - interval '30 days'
    GROUP  BY rang, etape
)
SELECT rang,
       etape,
       visiteurs,
       round(100.0 * visiteurs / NULLIF(max(visiteurs) OVER (), 0)) AS restants_pct
FROM   vues
ORDER  BY rang;


-- ---------- 2. Le tunnel complet, de l arrivee au paiement ----------
--
--  Lire de haut en bas : chaque ligne est une etape plus loin que la
--  precedente. Le grand ecart entre deux lignes voisines est l endroit
--  a reparer en premier.

SELECT evenement, count(DISTINCT session) AS visiteurs
FROM   evenements_tunnel
WHERE  created_at > now() - interval '30 days'
  AND  evenement IN (
        'page_vue',
        'tunnel_demarre',
        'tunnel_email_saisi',
        'estimation_demandee',
        'estimation_obtenue',
        'resultat_vu',
        'paywall_vue',
        'paywall_checkout_ouvert')
GROUP  BY evenement
ORDER  BY visiteurs DESC;


-- ---------- 3. Par quel bouton les gens entrent ----------
--
--  La page d accueil compte sept boutons d entree. Celui qui ne
--  travaille pas peut partir.

SELECT etape AS bouton, count(DISTINCT session) AS visiteurs
FROM   evenements_tunnel
WHERE  evenement = 'tunnel_demarre'
  AND  created_at > now() - interval '30 days'
GROUP  BY etape
ORDER  BY visiteurs DESC;


-- ---------- Entretien ----------
--
--  Une ligne pese une centaine d octets et une visite complete en ecrit
--  une vingtaine : a 20 visiteurs par jour c est invisible, a 10 000 ce
--  serait une vingtaine de Mo par jour sur les 500 Mo de l offre
--  gratuite Supabase. Le jour ou le trafic decolle, a passer une fois
--  par mois :
--
--  DELETE FROM evenements_tunnel WHERE created_at < now() - interval '90 days';
