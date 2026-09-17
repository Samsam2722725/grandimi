package api

import (
	"net/http"
	"strconv"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* Lire le tunnel sans passer par Supabase.

   POURQUOI CETTE ROUTE EXISTE
   La table evenements_tunnel repond a la seule question que Whop ne
   sait pas traiter : a quel ecran exactement les visiteurs partent.
   Mais elle ne se lisait qu en ouvrant l editeur SQL de Supabase, et
   cette session expire sans arret. Une mesure qu on n arrive pas a
   lire le jour ou on en a besoin ne sert a rien. Le rapport est donc
   servi par l API elle-meme : une adresse a mettre en favori, qui
   marche aussi depuis un telephone.

   COMMENT ELLE EST FERMEE
   Par ADMIN_TOKEN, le secret qui garde deja /api/admin : un second
   secret a poser, a retenir et a faire tourner aurait ete un secret
   de plus a oublier. Les chiffres passent donc par le groupe admin,
   et la cle voyage dans un en-tete Authorization, jamais dans
   l adresse : sinon elle finirait en clair dans les journaux d acces
   de Render et dans l historique du navigateur. La page HTML, elle,
   est publique, parce qu elle ne contient aucun chiffre : un champ,
   et c est tout.

   CE QUE LE RAPPORT NE PEUT PAS DIRE
   Mes propres passages de test sont dans la table, melanges aux
   vrais, et rien ne permet de les separer : aucun e-mail n y est
   stocke, par choix. Les premiers jours sont donc a lire avec ca en
   tete. */

// RapportTunnelJSON est servie par le groupe /api/admin : c est
// AdminAuthMiddleware qui a deja verifie ADMIN_TOKEN avant d arriver
// ici.
func RapportTunnelJSON(c *gin.Context) {
	jours, err := strconv.Atoi(c.DefaultQuery("jours", "30"))
	if err != nil || jours < 1 {
		jours = 30
	}
	if jours > 365 {
		jours = 365
	}

	ecrans, err := db.LireRapportTunnel(jours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erreur": "lecture impossible"})
		return
	}

	totaux, err := db.LireTotauxTunnel(jours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erreur": "lecture impossible"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"jours":      jours,
		"ecrans":     ecrans,
		"evenements": totaux,
	})
}

func PageRapportTunnel(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(pageRapportTunnel))
}

/* La page tient dans un seul fichier, sans dependance et sans etape
   de construction : le jour ou on en a besoin, elle doit marcher, pas
   attendre un build. */
const pageRapportTunnel = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tunnel Grandimi</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 64px;
    background: #0b0d12; color: #e8eaf0;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .page { max-width: 760px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sous { color: #8b93a7; margin: 0 0 24px; font-size: 14px; }
  form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  input, select, button {
    font: inherit; padding: 10px 12px; border-radius: 10px;
    border: 1px solid #262b38; background: #141823; color: #e8eaf0;
  }
  input { flex: 1 1 200px; }
  button { background: #3b82f6; border-color: #3b82f6; color: #fff; font-weight: 600; cursor: pointer; }
  button:hover { background: #2f6fd8; }
  #etat { color: #8b93a7; min-height: 20px; font-size: 14px; }
  h2 { font-size: 16px; margin: 28px 0 10px; color: #b9c0d0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; color: #8b93a7; font-weight: 500; padding: 6px 8px; border-bottom: 1px solid #262b38; }
  td { padding: 8px; border-bottom: 1px solid #191d28; vertical-align: middle; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  /* La jauge a une largeur fixe et la barre grandit DEDANS : une barre
     qui grandit dans la cellule elle-meme pousse le pourcentage a la
     ligne des que le chiffre est eleve. */
  td.reste { white-space: nowrap; }
  .jauge { display: inline-block; width: 84px; height: 8px; border-radius: 4px; background: #1c2130; vertical-align: middle; margin-right: 8px; overflow: hidden; }
  .barre { display: block; height: 100%; background: #3b82f6; }
  tr.chute .barre { background: #f97316; }
  tr.chute td { color: #ffb37a; }
  .vide { color: #8b93a7; }
  .note { color: #6f778a; font-size: 13px; margin-top: 24px; border-top: 1px solid #191d28; padding-top: 12px; }
</style>
</head>
<body>
<div class="page">
  <h1>Ou les visiteurs s arretent</h1>
  <p class="sous">Une ligne par ecran, dans l ordre ou ils s enchainent. La colonne de droite dit combien de gens sont partis a cet ecran precis.</p>

  <form id="formulaire">
    <input type="password" id="cle" placeholder="ADMIN_TOKEN" autocomplete="off" spellcheck="false">
    <select id="jours">
      <option value="7">7 jours</option>
      <option value="30" selected>30 jours</option>
      <option value="90">90 jours</option>
      <option value="365">1 an</option>
    </select>
    <button type="submit">Voir</button>
  </form>

  <p id="etat"></p>
  <div id="sortie"></div>

  <p class="note">Mes propres passages de test sont comptes avec les autres : la table ne stocke aucun e-mail, donc rien ne permet de les separer.</p>
</div>

<script>
(function () {
  var formulaire = document.getElementById('formulaire');
  var champCle = document.getElementById('cle');
  var champJours = document.getElementById('jours');
  var etat = document.getElementById('etat');
  var sortie = document.getElementById('sortie');

  var ORDRE = [
    ['page_vue', 'Pages vues'],
    ['tunnel_demarre', 'Questionnaire commence'],
    ['tunnel_email_saisi', 'E-mail saisi'],
    ['estimation_demandee', 'Estimation demandee'],
    ['estimation_obtenue', 'Estimation obtenue'],
    ['estimation_echouee', 'Estimation en echec'],
    ['resultat_vu', 'Resultat vu'],
    ['paywall_vue', 'Paywall vue'],
    ['paywall_plan_choisi', 'Offre choisie'],
    ['paywall_checkout_ouvert', 'Paiement ouvert'],
    ['paywall_checkout_echoue', 'Paiement en echec'],
    ['lien_parent_ouvert', 'Lien parent ouvert'],
    ['lien_parent_copie', 'Lien parent copie'],
    ['parent_page_vue', 'Page parent vue'],
    ['resultat_partage', 'Resultat partage'],
    ['tunnel_abandonne', 'Retour arriere au 1er ecran'],
    ['resiliation_demandee', 'Resiliation demandee']
  ];

  try { champCle.value = localStorage.getItem('grandimi:cle-rapport') || ''; } catch (e) {}

  formulaire.addEventListener('submit', function (e) { e.preventDefault(); charger(); });
  if (champCle.value) charger();

  function echapper(texte) {
    return String(texte).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function charger() {
    var cle = champCle.value.trim();
    if (!cle) { etat.textContent = 'Entre la cle de lecture.'; return; }
    try { localStorage.setItem('grandimi:cle-rapport', cle); } catch (e) {}

    etat.textContent = 'Lecture... (l API peut mettre une minute a se reveiller)';
    sortie.innerHTML = '';

    fetch('/api/admin/tunnel?jours=' + encodeURIComponent(champJours.value), {
      headers: { 'Authorization': 'Bearer ' + cle }
    }).then(function (r) {
      if (r.status === 401) throw new Error('Cle refusee (ou ADMIN_TOKEN absent du serveur).');
      if (!r.ok) throw new Error('Erreur ' + r.status);
      return r.json();
    }).then(afficher).catch(function (err) {
      etat.textContent = err.message;
    });
  }

  function afficher(donnees) {
    var ecrans = (donnees.ecrans || []).filter(function (l) {
      return l.evenement === 'tunnel_etape_vue';
    });
    var html = '';

    if (!ecrans.length) {
      html += '<p class="vide">Aucun passage enregistre sur cette periode.</p>';
    } else {
      var depart = ecrans[0].visiteurs;
      html += '<h2>Questionnaire, ecran par ecran</h2>';
      html += '<table><thead><tr><th>#</th><th>Ecran</th><th class="n">Visiteurs</th><th>Reste</th><th class="n">Partis ici</th></tr></thead><tbody>';

      ecrans.forEach(function (e, i) {
        var avant = i === 0 ? e.visiteurs : ecrans[i - 1].visiteurs;
        var partis = avant - e.visiteurs;
        var pctPartis = avant ? Math.round(partis * 100 / avant) : 0;
        var pctReste = depart ? Math.round(e.visiteurs * 100 / depart) : 0;

        html += '<tr class="' + (pctPartis >= 15 ? 'chute' : '') + '">'
          + '<td>' + e.rang + '</td>'
          + '<td>' + echapper(e.etape || '(sans nom)') + '</td>'
          + '<td class="n">' + e.visiteurs + '</td>'
          + '<td class="reste"><span class="jauge"><span class="barre" style="width:' + pctReste + '%"></span></span>' + pctReste + ' %</td>'
          + '<td class="n">' + (partis > 0 ? '-' + partis + ' (' + pctPartis + ' %)' : '') + '</td>'
          + '</tr>';
      });

      html += '</tbody></table>';
    }

    var parNom = {};
    (donnees.evenements || []).forEach(function (t) { parNom[t.evenement] = t.visiteurs; });

    var connus = ORDRE.filter(function (paire) { return parNom[paire[0]] > 0; });
    if (connus.length) {
      html += '<h2>Les grandes etapes</h2>';
      html += '<table><tbody>';
      connus.forEach(function (paire) {
        html += '<tr><td>' + paire[1] + '</td><td class="n">' + parNom[paire[0]] + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    sortie.innerHTML = html;
    etat.textContent = 'Sur ' + donnees.jours + ' jours.';
  }
})();
</script>
</body>
</html>
`
