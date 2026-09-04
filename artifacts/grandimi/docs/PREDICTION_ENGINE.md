# Moteur d’estimation de taille adulte — Grandimi

## Périmètre

Cette étape couvre uniquement le moteur déterministe d’estimation de taille adulte et
la page interne `/prediction-lab`. Aucun LLM, appel réseau, base de données ou service
externe n’intervient dans le calcul.

## Méthode

Grandimi utilise la méthode Khamis–Roche, publiée en 1994 et corrigée par un erratum
en 1995 :

`taille adulte (pouces) = B0 + B1 × taille actuelle (pouces) + B2 × poids (livres) + B3 × taille parentale moyenne (pouces)`

La taille parentale moyenne est `(taille du père biologique + taille de la mère biologique) / 2`.
Les coefficients intègrent déjà le sexe du modèle ; aucune correction de 13 cm n’est ajoutée.

## Sources et traçabilité

Consultation : 4 septembre 2026 (Europe/Zurich).

| Source | URL directe | Erratum utilisé ? | Différences constatées |
| --- | --- | --- | --- |
| Khamis HJ, Roche AF, article primaire (1994) | https://pubmed.ncbi.nlm.nih.gov/7936860/ | Référence de l’étude, mais table primaire complète non vérifiée directement | Le résumé confirme la méthode et la population d’étude ; il ne rend pas la table complète exploitable dans cette vérification. |
| American Academy of Pediatrics, article | https://publications.aap.org/pediatrics/article/94/4/504/59488/Predicting-Adult-Stature-Without-Using-Skeletal | Non vérifiable directement dans la version accessible | La page confirme la publication, mais l’accès complet à la table est limité. |
| American Academy of Pediatrics, erratum (1995) | https://publications.aap.org/pediatrics/article/95/3/457/59792/ERRATUM | Oui, explicitement pris en compte par la source secondaire | L’erratum signale des erreurs dans les tables 1 et 2. |
| InfantChart, implémentation secondaire publique | https://www.infantchart.com/height-predictor | Oui, la page indique que ses coefficients corrigent l’erratum 1995 | Cette table est la reproduction opérationnelle utilisée ici ; elle contient 28 lignes par sexe, de 4 à 17,5 ans. |

**Table reproduite depuis des sources secondaires concordantes, mais non vérifiée directement contre le document primaire.**

La table intégrée contient 56 lignes et 224 coefficients finis. Le contrôle automatique
compte ces lignes, vérifie l’unicité des âges et refuse les valeurs non finies.

## Âge et interpolation

`calculateDecimalAge` utilise les dates civiles complètes, sans approximation par
l’année seule. Les dates avant la naissance et les âges hors de `[4, 17,5]` ans sont
refusés. Pour une naissance le 29 février, l’anniversaire civil des années non
bissextiles est traité au 28 février afin d’éviter un saut artificiel.

Les lignes tabulées sont espacées de 0,5 an. Une ligne exacte est utilisée telle quelle.
Entre deux lignes, Grandimi interpole linéairement chacun des quatre coefficients.
Cette interpolation est une décision d’implémentation de Grandimi ; elle n’est pas une
exigence explicitement imposée par l’étude originale.

## Unités et précision

Les tailles sont converties de centimètres en pouces et le poids de kilogrammes en
livres. La régression est exécutée en unités impériales, puis le résultat est reconverti
en centimètres. Aucun arrondi intermédiaire n’est effectué. La valeur affichée dans
l’interface est arrondie seulement à 0,1 cm.

## Validation

| Donnée | Limite |
| --- | --- |
| Taille actuelle | 80 à 220 cm |
| Poids actuel | 10 à 200 kg |
| Taille de chaque parent biologique | 120 à 230 cm |
| Âge | 4,0 à 17,5 ans |

Les valeurs manquantes, non numériques, `NaN`, infinies, négatives et hors limites
produisent une erreur explicite. Une taille parentale inconnue n’est jamais remplacée
par une moyenne de population.

## Fourchette contextuelle

L’interface affiche une **Fourchette contextuelle fondée sur l’erreur moyenne observée
dans l’échantillon original.** Elle applique la borne moyenne d’erreur absolue à 90 %
rapportée par la source secondaire : ±5,34 cm pour le modèle masculin et ±4,25 cm pour
le modèle féminin. Cette fourchette n’est pas un intervalle de confiance individuel.

## Avertissements scientifiques obligatoires

Chaque résultat rappelle que l’estimation n’est pas un diagnostic médical, n’utilise pas
l’âge osseux, peut être moins fiable en cas de puberté précoce ou tardive, et provient
d’une étude sur des enfants blancs américains en bonne santé. L’usage pour d’autres
populations est une extrapolation. Les mesures imprécises changent le résultat et aucun
mode de vie ne garantit une taille particulière.

## Contrôles de référence

Le cas obligatoire est reproduit par les tests :

- garçon, âge exact 10 ans ;
- 140 cm, 35 kg ;
- mère 165 cm, père 178 cm ;
- coefficients corrigés `B0 = -11.038`, `B1 = 0.97135`, `B2 = -0.039981`,
  `B3 = 0.45932` ;
- résultat : environ 178,9 cm.

Deux contrôles indépendants supplémentaires sont inclus dans les tests : l’exemple
féminin à 4 ans publié par InfantChart (100 cm, 16 kg, parents 160/175 cm, environ
161,7 cm) et un cas masculin de milieu d’enfance calculé sur la ligne publiée de
10,5 ans (170 cm, 60 kg, parents 168/185 cm, environ 201,5 cm). Un troisième contrôle
à âge intermédiaire vérifie l’interpolation. Les coefficients et ces cas proviennent
de l’implémentation secondaire InfantChart citée ci-dessus ; ils ne constituent pas
une nouvelle validation clinique.

## Audit exécuté

Les commandes et contrôles prévus pour cette étape sont :

- lint : `pnpm --filter @workspace/grandimi run lint` (contrôle Prettier des sources du moteur et de la page) ;
- typecheck : `pnpm --filter @workspace/grandimi run typecheck` ;
- tests unitaires : `pnpm --filter @workspace/grandimi run test` ;
- build : `pnpm --filter @workspace/grandimi run build` ;
- ouverture de `/prediction-lab` dans le navigateur ;
- contrôle visuel du cas à 178,9 cm et d’un âge invalide ;
- vérification de la console navigateur ;
- vérification que le moteur n’effectue aucun appel réseau ;
- contrôle de mise en page à 390 px.

**ÉTAPE 1 VALIDÉE**