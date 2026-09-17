# Les pièges qui m'ont coûté du temps sur Grandimi

À copier dans tout nouveau projet, en `CLAUDE.md` ou à côté.
Chaque ligne est un problème **constaté en production**, pas une bonne
pratique théorique. Le coût réel est indiqué quand il l'a été.

---

## Paiement (Whop)

**Les métadonnées de l'URL de checkout sont ignorées.**
`&metadata[cle]=valeur` n'arrive jamais : le webhook reçoit
`"metadata":{}`. Vérifié sur trois paiements réels.
→ *Coût : le parcours parent n'a jamais fonctionné pendant des semaines.*

**L'adresse e-mail ne relie rien.**
Celle tapée sur la page de paiement est modifiable et n'a aucune raison
d'être celle du site. Résultat : deux comptes, le premium sur le mauvais,
et un client qui lit « abonnement requis » après avoir payé.

**Le seul lien fiable est l'identifiant de paiement** (`pay_XXXX`).
Il est à la fois dans l'URL de retour du client et dans le webhook signé.
Le client le réclame au retour, une seule fois.

**Un paiement ne doit être réclamable qu'UNE fois.**
Sans cette borne, un identifiant partagé ouvre autant d'accès qu'on le
recopie. Réserver d'abord (`UPDATE ... WHERE reclame_at IS NULL`),
travailler ensuite.

**Attention aux index UNIQUE lors d'un transfert de compte.**
`whop_customer_id` porte un UNIQUE : il faut le libérer (`NULL`, pas `''`)
de l'ancien compte AVANT de le poser sur le nouveau, sinon toute la
transaction casse.
→ *Coût : la réclamation rendait 500 pour le seul cas qu'elle traitait.*

**Ne déplacer QUE l'abonnement qui vient d'être payé.**
Déplacer « tous les abonnements de ce client » a mis 9 abonnements sur un
compte créé le jour même. Sur un vrai client qui achète deux fois, le
premier bénéficiaire perd son accès.

**Un client déjà abonné ne génère pas de nouvel abonnement.**
Whop ne recrée pas de membership si un actif existe → compte premium
sans ligne d'abonnement, donc « Mon compte » vide et résiliation morte.

**Signature du webhook — format Standard Webhooks.**
Message signé = `{webhook-id}.{webhook-timestamp}.{corps brut}`,
HMAC-SHA256, encodé base64, comparé à la partie après `v1,` de l'en-tête
`webhook-signature`. **Fail-closed** : secret absent = refus, jamais
laisser passer.

---

## Hébergement

**Render gratuit s'endort après ~15 min.**
Le premier appel peut prendre jusqu'à une minute. Un bouton qui tourne en
silence se lit comme un bouton cassé.
→ Réveiller l'instance au chargement de la page, et nommer l'attente
passé 4 secondes.

**Supabase gratuit = aucune sauvegarde.** À savoir avant d'y mettre des
clients.

**RLS activée, zéro politique, sur toute table interne.**
Supabase publie le schéma `public` via son API REST : sans RLS, la table
est lisible et modifiable avec la clé anon. Le backend passe par
`DATABASE_URL` avec un rôle qui contourne RLS, donc rien ne change pour
lui.

**`timestamp` et `timestamptz` ne se comparent pas impunément.**
Deux tables du même projet n'avaient pas le même type. La comparaison
marche tant que la base tourne en UTC, et se décale de plusieurs heures
le jour où ce n'est plus vrai. Écrire `AT TIME ZONE 'UTC'` explicitement.

**Ne jamais se fier à l'ordre d'arrivée de deux webhooks.**
Prévoir une fenêtre de tolérance plutôt qu'une borne stricte.

---

## Front

**Une SPA qui ne change jamais d'URL n'est pas mesurable.**
Le pixel comptait 131 vues sur la seule page « / ». Aucun outil ne peut
dire où les gens s'arrêtent.
→ Poser des événements explicites, et les écrire aussi dans SA PROPRE
base : un tableau de bord tiers ne se lit qu'en s'y connectant.

**L'affichage et la condition doivent venir du MÊME nombre.**
La condition testait la valeur brute (`0,1 > 0`) pendant que l'affichage
arrondissait (`0`). Résultat à l'écran : « Il te reste encore **+0 cm** »,
suivi d'un bouton à 4,99 €/mois.
→ *Coût : tous les visiteurs proches de leur taille finale, soit la
moitié des filles.*

**Une promesse écrite sur l'accueil contraint tout le reste.**
« Aucun résultat flouté » interdit de verrouiller le résultat plus tard,
même si le concurrent le fait. Vérifier les promesses AVANT de concevoir
un paywall.

**Chercher les valeurs écrites en dur dans ce qu'on vend comme
« personnalisé ».** Le plan annonçait `BedTime: "10:00 PM"` à tout le
monde — en anglais, sur un site français.

**Un écran de tunnel se lit en une ligne par carte.**
Des phrases de 11 mots passent à trois lignes, la dernière carte finit
sous le bouton, et l'écran se lit comme un paragraphe découpé.

---

## Méthode

**Vérifier en production, pas dans le code.**
Deux hypothèses de bug successives, toutes deux cohérentes à la lecture,
toutes deux fausses. Seule la base de données a tranché.

**Lire la base, pas la capture d'écran.**
Un identifiant de paiement mal recopié depuis une image (`I` majuscule
contre `l` minuscule) fait chercher au mauvais endroit.

**Un script qui écrit du code doit être vérifié comme du code.**
Un remplacement a inséré un vrai saut de ligne dans une chaîne Go, qui ne
peut pas franchir une fin de ligne. La CI l'a attrapé, pas moi.

**Sans compilateur local, la CI est le seul garde-fou.**
Ne jamais considérer un push backend comme livré avant son feu vert.

**Fins de ligne mixtes.** Front en CRLF, Go en LF. Un outil de
remplacement doit normaliser puis restaurer, sinon les remplacements
multi-lignes échouent en silence.

---

## Légal (France, produit grand public)

- Mentions légales complètes : c'est le seul vrai bloqueur de lancement.
- Un chiffre de performance affiché doit être **vérifiable**. Un « 98,5 %
  de précision » inventé est de la publicité trompeuse.
- Public mineur = circonstance aggravante sur les pratiques commerciales
  (code de la consommation, L121-1 et suivants).
- Produit touchant à la santé : mention « n'est pas un dispositif médical »
  présente et accessible.
