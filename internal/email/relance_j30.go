package email

import (
	"fmt"
	"html"
)

// TypeRelanceJ30 est la valeur écrite dans email_envois.type. L'index
// UNIQUE (user_id, type) de la base garantit qu'une personne ne la
// reçoit qu'une fois, même si la tâche d'envoi est rejouée.
const TypeRelanceJ30 = "relance_j30"

/* RelanceJ30 construit la relance à un mois.

   POURQUOI CELLE-CI ET PAS UNE AUTRE. C'est le seul e-mail qu'un
   non-acheteur ait une vraie raison d'ouvrir : la croissance a bougé
   depuis un mois, donc l'estimation change pour de bon. Ce n'est pas un
   prétexte marketing habillé en service — la promesse est exacte, et
   c'est la seule qu'on puisse tenir sans mentir.

   CE QU'IL NE CONTIENT PAS : aucun prix, aucun bouton d'abonnement,
   aucune relance sur le plan payant. Le destinataire a entre 12 et 17
   ans. Un e-mail commercial vers un mineur qui n'a rien acheté est
   exactement ce qu'on refuse de faire ; la page de vente existe, il la
   reverra s'il revient. L'e-mail rend un service, un point.

   CE QU'IL NE PORTE PAS NON PLUS : ni taille, ni poids, ni estimation
   chiffrée. Un e-mail transite en clair par plusieurs serveurs et
   s'affiche en notification sur un écran verrouillé, parfois celui d'un
   téléphone familial. Les mesures d'un mineur n'ont rien à y faire. */
func RelanceJ30(destinataire, userID string) (Message, error) {
	lienDesinscription, err := LienDesinscription(userID)
	if err != nil {
		return Message{}, err
	}
	lienSite := BaseSite() + "/"

	texte := fmt.Sprintf(`Salut,

Tu as estimé ta taille adulte sur Grandimi il y a un mois.

Un mois, ça compte : l'estimation part de ta taille actuelle, donc elle
change vraiment quand tu te re-mesures. Refais le questionnaire, c'est
gratuit et ça prend deux minutes.

Refaire mon estimation : %s

--
Tu reçois ce message parce que tu as laissé ton adresse en faisant ton
estimation. C'est le seul e-mail de ce genre que nous envoyons.
Ne plus rien recevoir : %s
`, lienSite, lienDesinscription)

	site := html.EscapeString(lienSite)
	desinscription := html.EscapeString(lienDesinscription)

	/* HTML volontairement pauvre : styles en ligne, un seul tableau
	   implicite, aucune image, aucune police distante. Outlook ignore les
	   feuilles de style, Gmail coupe les messages trop lourds, et une
	   image bloquée par défaut laisserait un message à trous. */
	corpsHTML := fmt.Sprintf(`<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#fbf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17120e;">
  <div style="max-width:520px;margin:0 auto;">
    <p style="margin:0 0 24px;font-size:14px;letter-spacing:3px;font-weight:700;color:#ff5a1f;">GRANDIMI</p>

    <p style="margin:0 0 16px;font-size:17px;line-height:1.55;">Salut,</p>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.55;">
      Tu as estimé ta taille adulte sur Grandimi il y a un mois.
    </p>
    <p style="margin:0 0 28px;font-size:17px;line-height:1.55;">
      Un mois, ça compte : l'estimation part de ta taille actuelle, donc elle
      change vraiment quand tu te re-mesures. Refais le questionnaire, c'est
      gratuit et ça prend deux minutes.
    </p>

    <p style="margin:0 0 32px;">
      <a href="%s" style="display:inline-block;background:#ff5a1f;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:16px;font-weight:600;">Refaire mon estimation</a>
    </p>

    <hr style="border:none;border-top:1px solid #e4ddd4;margin:0 0 16px;" />
    <p style="margin:0;font-size:13px;line-height:1.5;color:#6f675f;">
      Tu reçois ce message parce que tu as laissé ton adresse en faisant ton
      estimation. C'est le seul e-mail de ce genre que nous envoyons.<br />
      <a href="%s" style="color:#6f675f;">Ne plus rien recevoir</a>
    </p>
  </div>
</body></html>`, site, desinscription)

	return Message{
		A:              destinataire,
		Sujet:          "Ça fait un mois — re-mesure-toi",
		Texte:          texte,
		HTML:           corpsHTML,
		Desinscription: lienDesinscription,
	}, nil
}
