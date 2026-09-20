package db

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"strings"
)

/* Nutrition : le catalogue, le journal du jour, et les objectifs.

   Les objectifs sont CALCULÉS à la création puis stockés, jamais
   recalculés à chaque affichage. Un objectif qui change tout seul parce
   que l'utilisateur a mis à jour son poids ferait bouger le pourcentage
   d'hier. Un objectif est un engagement : il se met à jour quand on le
   décide. */

type Aliment struct {
	ID        string  `json:"id"`
	Slug      string  `json:"slug"`
	Nom       string  `json:"nom"`
	Kcal      float64 `json:"kcal"`
	Proteines float64 `json:"proteines_g"`
	Calcium   float64 `json:"calcium_mg"`
	VitD      float64 `json:"vit_d_ui"`
	PortionG  float64 `json:"portion_g"`
	Categorie string  `json:"categorie"`
}

type Repas struct {
	ID        string  `json:"id"`
	Moment    string  `json:"moment"`
	Libelle   string  `json:"libelle"`
	QuantiteG float64 `json:"quantite_g"`
	Kcal      float64 `json:"kcal"`
	Proteines float64 `json:"proteines_g"`
	Calcium   float64 `json:"calcium_mg"`
	VitD      float64 `json:"vit_d_ui"`
}

type Objectifs struct {
	Kcal       int  `json:"kcal"`
	Proteines  int  `json:"proteines_g"`
	Calcium    int  `json:"calcium_mg"`
	VitD       int  `json:"vit_d_ui"`
	AjusteMain bool `json:"ajuste_main"`
}

// ChercherAliments cherche par préfixe, insensible à la casse.
//
// Par préfixe et non par sous-chaîne : c'est la façon dont on tape dans
// un champ de recherche, et l'index de la table est posé pour ça. Une
// recherche en `%…%` n'utiliserait pas l'index et ramènerait « pain de
// mie » quand on tape « mie ».
func ChercherAliments(q string, limite int) ([]Aliment, error) {
	if limite <= 0 || limite > 50 {
		limite = 20
	}

	prefixe := strings.ToLower(strings.TrimSpace(q)) + "%"
	rows, err := DB.QueryContext(context.Background(),
		`SELECT id::text, slug, nom_fr, kcal, proteines_g, calcium_mg, vit_d_ui,
		        COALESCE(portion_g, 100), categorie
		 FROM   aliments
		 WHERE  lower(nom_fr) LIKE $1
		 ORDER BY nom_fr
		 LIMIT  $2`, prefixe, limite)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Aliment, 0, limite)
	for rows.Next() {
		var a Aliment
		if err := rows.Scan(&a.ID, &a.Slug, &a.Nom, &a.Kcal, &a.Proteines,
			&a.Calcium, &a.VitD, &a.PortionG, &a.Categorie); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// RepasDuJour renvoie le journal d'une journée.
func RepasDuJour(userID, jour string) ([]Repas, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT id::text, moment, libelle, quantite_g, kcal, proteines_g, calcium_mg, vit_d_ui
		 FROM   meal_logs
		 WHERE  user_id = $1 AND jour = $2
		 ORDER BY cree_le`, userID, jour)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Repas, 0, 8)
	for rows.Next() {
		var r Repas
		if err := rows.Scan(&r.ID, &r.Moment, &r.Libelle, &r.QuantiteG,
			&r.Kcal, &r.Proteines, &r.Calcium, &r.VitD); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// AjouterRepas enregistre une portion d'aliment.
//
// Les valeurs sont RECOPIÉES depuis le catalogue au moment de la saisie,
// pas référencées. Corriger une fiche dans six mois réécrirait
// rétroactivement des journées déjà enregistrées, et une courbe de
// nutrition qui change toute seule dans le passé est une courbe à
// laquelle personne ne fait plus confiance.
func AjouterRepas(userID, jour, moment, slug string, quantiteG float64) (*Repas, error) {
	var a Aliment
	err := DB.QueryRowContext(context.Background(),
		`SELECT id::text, nom_fr, kcal, proteines_g, calcium_mg, vit_d_ui
		 FROM   aliments WHERE slug = $1`, slug).
		Scan(&a.ID, &a.Nom, &a.Kcal, &a.Proteines, &a.Calcium, &a.VitD)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("aliment inconnu")
	}
	if err != nil {
		return nil, err
	}

	// Les valeurs du catalogue sont POUR 100 g, toujours.
	f := quantiteG / 100

	r := Repas{
		Moment:    moment,
		Libelle:   a.Nom,
		QuantiteG: quantiteG,
		Kcal:      arrondi(a.Kcal * f),
		Proteines: arrondi(a.Proteines * f),
		Calcium:   arrondi(a.Calcium * f),
		VitD:      arrondi(a.VitD * f),
	}

	err = DB.QueryRowContext(context.Background(),
		`INSERT INTO meal_logs (user_id, jour, moment, aliment_id, libelle,
		                        quantite_g, kcal, proteines_g, calcium_mg, vit_d_ui)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text`,
		userID, jour, moment, a.ID, r.Libelle, r.QuantiteG,
		r.Kcal, r.Proteines, r.Calcium, r.VitD).Scan(&r.ID)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// SupprimerRepas retire une ligne du journal.
//
// La clause sur user_id n'est pas décorative : sans elle, un identifiant
// deviné suffirait à effacer la ligne de quelqu'un d'autre.
func SupprimerRepas(userID, id string) error {
	_, err := DB.ExecContext(context.Background(),
		`DELETE FROM meal_logs WHERE id = $1::uuid AND user_id = $2`, id, userID)
	return err
}

func arrondi(v float64) float64 {
	return math.Round(v*10) / 10
}

// ObjectifsDuCompte lit les objectifs, et les calcule à la première
// demande s'ils n'existent pas encore.
func ObjectifsDuCompte(userID string) (Objectifs, error) {
	var o Objectifs
	err := DB.QueryRowContext(context.Background(),
		`SELECT kcal, proteines_g, calcium_mg, vit_d_ui, ajuste_main
		 FROM nutrition_targets WHERE user_id = $1`, userID).
		Scan(&o.Kcal, &o.Proteines, &o.Calcium, &o.VitD, &o.AjusteMain)

	if err == nil {
		return o, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return o, err
	}

	o = calculerObjectifs(profilDuCompte(userID))
	_, err = DB.ExecContext(context.Background(),
		`INSERT INTO nutrition_targets (user_id, kcal, proteines_g, calcium_mg, vit_d_ui)
		 VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO NOTHING`,
		userID, o.Kcal, o.Proteines, o.Calcium, o.VitD)
	return o, err
}

// EnregistrerObjectifs remplace les objectifs par ceux choisis à la main.
func EnregistrerObjectifs(userID string, o Objectifs) error {
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO nutrition_targets (user_id, kcal, proteines_g, calcium_mg, vit_d_ui, ajuste_main, updated_at)
		 VALUES ($1,$2,$3,$4,$5,true,now())
		 ON CONFLICT (user_id) DO UPDATE SET
		   kcal = EXCLUDED.kcal, proteines_g = EXCLUDED.proteines_g,
		   calcium_mg = EXCLUDED.calcium_mg, vit_d_ui = EXCLUDED.vit_d_ui,
		   ajuste_main = true, updated_at = now()`,
		userID, o.Kcal, o.Proteines, o.Calcium, o.VitD)
	return err
}

type profil struct {
	Age    float64
	Sexe   string
	PoidsK float64
	Connu  bool
}

// profilDuCompte lit la dernière prédiction, qui porte l'âge, le sexe et
// le poids saisis au questionnaire. Aucune ligne : on renvoie un profil
// inconnu, et le calcul retombera sur des valeurs par défaut.
func profilDuCompte(userID string) profil {
	var p profil
	err := DB.QueryRowContext(context.Background(),
		`SELECT age, sex, weight_kg FROM predictions
		 WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, userID).
		Scan(&p.Age, &p.Sexe, &p.PoidsK)
	p.Connu = err == nil && p.PoidsK > 0
	return p
}

/*
calculerObjectifs pose les quatre cibles.

	PROTÉINES : 1,4 g par kg de poids. C'est le haut de la fourchette utile
	chez l'adolescent en croissance (1,2 à 1,5). Le concurrent affiche 150 g
	à tout le monde : cela convient à quelqu'un de 110 kg et représente
	environ le triple du besoin d'une fille de 45 kg. Un objectif
	inatteignable ne motive pas, il fait abandonner le suivi.

	CALCIUM : 1300 mg. Apport de référence 9-18 ans, indépendant du poids.
	Il soutient la minéralisation osseuse — aucun effet démontré sur la
	taille adulte, effet réel sur la densité.

	VITAMINE D : 600 UI. Au-delà de 4000 UI/j la supplémentation devient un
	risque, pas un bénéfice. Elle n'agit sur la croissance qu'en cas de
	carence : chez un sujet déjà repu, en ajouter ne fait pas grandir.

	ÉNERGIE : Harris-Benedict révisé (Roza & Shizgal), multiplié par un
	facteur d'activité de 1,6 — un adolescent scolarisé avec du sport.
	L'approximation est assumée : à ±200 kcal près, ce chiffre sert à
	repérer un déficit chronique, pas à peser des rations.
*/
func calculerObjectifs(p profil) Objectifs {
	o := Objectifs{Calcium: 1300, VitD: 600}

	if !p.Connu {
		// Valeurs médianes d'un adolescent de 14 ans, en attendant que le
		// questionnaire ait été rempli. Marquées comme non ajustées :
		// elles seront recalculées dès qu'un profil existe.
		o.Kcal, o.Proteines = 2400, 75
		return o
	}

	// La taille manque ici (elle vit dans height_logs et bouge) : on
	// prend une taille plausible pour l'âge. L'erreur induite sur le
	// métabolisme de base est de l'ordre de 50 kcal, très en dessous de
	// la précision d'un journal alimentaire déclaratif.
	tailleCm := 150 + 3.5*(p.Age-10)
	if tailleCm < 120 {
		tailleCm = 120
	}

	var base float64
	if strings.EqualFold(p.Sexe, "F") {
		base = 447.593 + 9.247*p.PoidsK + 3.098*tailleCm - 4.330*p.Age
	} else {
		base = 88.362 + 13.397*p.PoidsK + 4.799*tailleCm - 5.677*p.Age
	}

	o.Kcal = int(math.Round(base*1.6/50) * 50) // arrondi aux 50 kcal
	o.Proteines = int(math.Round(p.PoidsK * 1.4))

	// Garde-fous : un poids aberrant ne doit pas produire une cible
	// aberrante affichée comme un objectif à atteindre.
	if o.Kcal < 1400 {
		o.Kcal = 1400
	}
	if o.Kcal > 4500 {
		o.Kcal = 4500
	}
	if o.Proteines < 30 {
		o.Proteines = 30
	}
	if o.Proteines > 180 {
		o.Proteines = 180
	}
	return o
}
