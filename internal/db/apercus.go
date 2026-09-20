package db

import (
	"context"
	"math"
	"time"
)

/* La vitesse de croissance, et pourquoi elle est si difficile à afficher
   honnêtement.

   C'est le seul signal qui vaille quelque chose dans cette application :
   une taille isolée ne dit rien, une vitesse dit si la croissance suit
   son cours. Mais elle se calcule en divisant une différence de tailles
   par une durée, et l'erreur de mesure se divise avec elle.

   Avec un écart-type de mesure de 0,4 cm — ce qu'on obtient au mieux au
   mur, avec le protocole guidé — l'incertitude sur une vitesse estimée
   à partir de deux points vaut environ 0,57 / Δt années :

       2 semaines  ->  ±15 cm/an     inutilisable
       2 mois      ->  ±3,5 cm/an    inutilisable
       6 mois      ->  ±1,2 cm/an    exploitable
       1 an        ->  ±0,6 cm/an    bon

   Un adolescent en poussée grandit de 8 à 10 cm/an. Annoncer « 14 cm/an »
   après trois semaines de suivi, c'est afficher du bruit avec deux
   décimales — et le faire lire comme un résultat.

   D'où deux décisions :
     - la pente est estimée par MOINDRES CARRÉS sur tous les points, pas
       entre le premier et le dernier : chaque mesure supplémentaire
       resserre l'estimation au lieu d'être ignorée ;
     - l'incertitude est CALCULÉE et renvoyée, et en dessous d'un seuil
       de fiabilité on ne renvoie pas de chiffre du tout. */

// JoursMinVitesse : en dessous, aucune vitesse n'est renvoyée.
//
// 90 jours donne une marge de l'ordre de ±2 cm/an avec trois points —
// encore large, mais l'ordre de grandeur devient juste, et c'est le
// moment où le chiffre commence à porter une information plutôt qu'un
// écho de l'erreur de mesure.
const JoursMinVitesse = 90

// MargeMaxVitesse : au-delà, le chiffre est trop imprécis pour être
// montré, quelle que soit la durée couverte.
const MargeMaxVitesse = 4.0

type PointTaille struct {
	Date     string  `json:"date"`
	TailleCm float64 `json:"taille_cm"`
}

type Vitesse struct {
	// CmParAn est la pente estimée. Absente quand Fiable est faux.
	CmParAn float64 `json:"cm_par_an"`
	// Marge est le demi-intervalle à ~95 % (deux erreurs types).
	Marge float64 `json:"marge"`
	// Fiable dit si le chiffre a le droit d'être affiché.
	Fiable bool `json:"fiable"`
	// Pourquoi explique le refus, pour que l'écran dise quoi faire.
	Pourquoi      string `json:"pourquoi,omitempty"`
	JoursCouverts int    `json:"jours_couverts"`
	NbMesures     int    `json:"nb_mesures"`
}

// HistoriqueTaille renvoie toutes les mesures, de la plus ancienne à la
// plus récente.
func HistoriqueTaille(userID string) ([]PointTaille, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT mesure_le::text, taille_cm FROM height_logs
		 WHERE user_id = $1 ORDER BY mesure_le`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]PointTaille, 0, 16)
	for rows.Next() {
		var p PointTaille
		if err := rows.Scan(&p.Date, &p.TailleCm); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// CalculerVitesse estime la pente en cm/an et son incertitude.
//
// Séparée de la lecture en base pour être testable sans base : c'est ici
// que se cachent les erreurs, et c'est le seul chiffre de l'application
// qu'un médecin pourrait regarder.
func CalculerVitesse(points []PointTaille) Vitesse {
	v := Vitesse{NbMesures: len(points)}

	if len(points) < 2 {
		v.Pourquoi = "pas_assez_de_mesures"
		return v
	}

	// Abscisses en années depuis la première mesure.
	type xy struct{ x, y float64 }
	obs := make([]xy, 0, len(points))
	var t0 time.Time
	for i, p := range points {
		d, err := time.Parse("2006-01-02", p.Date)
		if err != nil {
			continue
		}
		if i == 0 {
			t0 = d
		}
		obs = append(obs, xy{x: d.Sub(t0).Hours() / 24 / 365.25, y: p.TailleCm})
	}
	if len(obs) < 2 {
		v.Pourquoi = "pas_assez_de_mesures"
		return v
	}

	v.JoursCouverts = int(math.Round(obs[len(obs)-1].x * 365.25))
	if v.JoursCouverts < JoursMinVitesse {
		v.Pourquoi = "periode_trop_courte"
		return v
	}

	// Moindres carrés : pente = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)².
	n := float64(len(obs))
	var sx, sy float64
	for _, o := range obs {
		sx += o.x
		sy += o.y
	}
	mx, my := sx/n, sy/n

	var num, den float64
	for _, o := range obs {
		num += (o.x - mx) * (o.y - my)
		den += (o.x - mx) * (o.x - mx)
	}
	if den == 0 {
		v.Pourquoi = "periode_trop_courte"
		return v
	}
	pente := num / den

	/* L'erreur type de la pente.

	   Avec deux points seulement, la droite passe exactement par les
	   deux et les résidus sont nuls : la formule classique donnerait une
	   erreur de zéro, c'est-à-dire une certitude parfaite à partir de
	   deux mesures faites au mur. C'est faux, et c'est le piège de ce
	   calcul. On retombe alors sur l'erreur de mesure supposée. */
	const sigmaMesure = 0.4 // cm, protocole guidé en trois relevés

	var sigma float64
	if len(obs) > 2 {
		ordonnee := my - pente*mx
		var sse float64
		for _, o := range obs {
			r := o.y - (ordonnee + pente*o.x)
			sse += r * r
		}
		sigma = math.Sqrt(sse / (n - 2))
		// Plancher : trois points alignés par chance ne prouvent pas que
		// la mesure est parfaite.
		if sigma < sigmaMesure {
			sigma = sigmaMesure
		}
	} else {
		sigma = sigmaMesure
	}

	erreurType := sigma / math.Sqrt(den)
	v.CmParAn = math.Round(pente*10) / 10
	v.Marge = math.Round(2*erreurType*10) / 10

	if v.Marge > MargeMaxVitesse {
		v.Pourquoi = "trop_imprecis"
		return v
	}

	v.Fiable = true
	return v
}

/* Les deux piliers qui manquaient à l'appel.

   Nutrition et posture avaient des données depuis les étapes 3 et 4,
   mais restaient marqués « pas encore suivi » sur l'anneau de l'accueil
   et en fin de classement des aperçus. Un pilier « inconnu » alors que
   l'écran qui le remplit existe et déborde de lignes, c'est l'application
   qui se contredit elle-même d'un écran à l'autre. */

// ScoreNutrition7j note les sept derniers jours sur les SEULS jours où
// quelque chose a été noté — même règle que le sommeil.
//
// La note d'une journée est la part des quatre cibles atteintes, chacune
// plafonnée à 1 : manger le double de son objectif de protéines ne
// compense pas l'absence de calcium.
func ScoreNutrition7j(userID, debut, fin string) (int, bool) {
	var jours, somme float64
	err := DB.QueryRowContext(context.Background(),
		`WITH cibles AS (
		   SELECT kcal, proteines_g, calcium_mg, vit_d_ui
		   FROM   nutrition_targets WHERE user_id = $1
		 ),
		 par_jour AS (
		   SELECT m.jour,
		          sum(m.kcal)        AS kcal,
		          sum(m.proteines_g) AS prot,
		          sum(m.calcium_mg)  AS ca,
		          sum(m.vit_d_ui)    AS vd
		   FROM   meal_logs m
		   WHERE  m.user_id = $1 AND m.jour BETWEEN $2 AND $3
		   GROUP BY m.jour
		 )
		 SELECT count(*)::float8,
		        COALESCE(sum(
		          (least(p.kcal / NULLIF(c.kcal,0), 1)
		         + least(p.prot / NULLIF(c.proteines_g,0), 1)
		         + least(p.ca   / NULLIF(c.calcium_mg,0), 1)
		         + least(p.vd   / NULLIF(c.vit_d_ui,0), 1)) / 4
		        ), 0)
		 FROM par_jour p CROSS JOIN cibles c`,
		userID, debut, fin).Scan(&jours, &somme)

	if err != nil || jours == 0 {
		return 0, false
	}
	return int(math.Round(somme / jours * 100)), true
}

// ScorePosture7j note la part des exercices de POSTURE programmés sur
// les sept derniers jours qui ont été faits.
//
// Distinct du pilier « Exercices », qui compte les jours où l'on a
// bougé : celui-ci compte ce qui agit réellement sur la taille mesurée.
// C'est le seul levier de l'application dont l'effet soit à la fois réel
// et vérifiable par l'utilisateur, il mérite sa propre part.
func ScorePosture7j(userID, debut, fin string) (int, bool) {
	var total, faits float64
	err := DB.QueryRowContext(context.Background(),
		`SELECT count(*)::float8,
		        count(*) FILTER (WHERE tc.task_key IS NOT NULL)::float8
		 FROM   generate_series($2::date, $3::date, '1 day') AS j
		 JOIN   exercices e
		        ON e.actif
		       AND e.categorie = 'posture'
		       AND e.jours && ARRAY[EXTRACT(ISODOW FROM j)::smallint]
		 LEFT JOIN task_completions tc
		        ON tc.user_id = $1
		       AND tc.task_date = j::date
		       AND tc.task_key = $4 || e.slug`,
		userID, debut, fin, PrefixeTacheExercice).Scan(&total, &faits)

	if err != nil || total == 0 {
		return 0, false
	}
	return int(math.Round(faits / total * 100)), true
}
