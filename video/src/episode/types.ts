/**
 * Format d'un épisode (public/episodes/<id>/episode.json).
 *
 * Repères de temps (« ancres ») :
 *   "age"            début de la ligne de voix « age »
 *   "age:1m73"       début du mot qui commence par « 1m73 » dans cette ligne
 *   "age:taille#2"   deuxième occurrence du mot
 *   "age:1m73-2"     deux frames avant (+N : après)
 *   "age:fin"        fin de la ligne ; "fin" : fin de la vidéo
 *   un nombre        dans un plan : frames depuis le début du plan ; pour `debut` : frame absolue
 */
export type Ancre = string | number;

export type ImageRef = {fichier: string; w: number; h: number};
export type Zone = {x: number; y: number; z: number};

export type Camera = {a?: Ancre; zone?: string; x?: number; y?: number; z?: number; duree?: number | 'fin'; son?: string | null; volume?: number; lineaire?: boolean};

type Base = {a: Ancre; son?: string; volume?: number};
export type Element =
	| (Base & {type: 'image'; fichier: string; x: number; y: number; w: number; h: number; fin?: Ancre; effet?: 'pop' | 'pop-balance' | 'revele-bas'; rebond?: boolean; ecran?: boolean;
		/** Entrée glissée : part de (x, y) pixels de décalage et rejoint sa place en d frames, en fondu. */
		depuis?: {x?: number; y?: number; d?: number};
		/** Deuxième image qui alterne avec la première toutes les `periode` frames (flèche dorée / bleue). */
		alterne?: string; periode?: number;
		/** Grandit depuis le bas (échelle `de` → 1 en `d` frames), puis continue très lentement. */
		grandit?: {de: number; d: number}})
	| (Base & {type: 'trait'; d: string; tete?: string; couleur?: string; epaisseur?: number; duree?: number; fin?: Ancre})
	/** x : centre horizontal du texte (défaut : milieu de l'écran). */
	| (Base & {type: 'texte'; texte: string; x?: number; y: number; taille: number; couleur?: string; contour?: number; contourCouleur?: string; poids?: number; fond?: string; amorti?: number; effet?: 'pop' | 'pop-balance' | 'glitch' | 'fondu'; fin?: Ancre; lueur?: string})
	| (Base & {type: 'tape'; texte: string; y: number; taille: number; parLettre?: number; couleur?: string; contour?: number; curseur?: boolean; fond?: string; police?: string; poids?: number; fin?: Ancre})
	/** Compteur qui défile de `de` à `vers` et se pose sur `arrivee` (révélation avec suspense). */
	| (Base & {type: 'compteur'; de: number; vers: number; arrivee: Ancre; fin?: Ancre; suffixe?: string; y: number; taille: number; couleur?: string; voile?: boolean})
	/** Fausse zone de commentaire TikTok qui s'écrit toute seule. */
	| (Base & {type: 'commentaire'; texte: string; y: number; parLettre?: number; envoi?: Ancre})
	/** Icône message privé avec pastille rouge dont le compteur monte (référence Steve, fin). */
	| (Base & {type: 'dm'; x: number; y: number; taille: number; de: number; vers: number})
	/** Écran « Création de ton plan… » qui glisse depuis la droite ; chaque étape se coche à son ancre, 100 % à `fin`
	    (référence rayan.taller, src/episode/ChargementPlan.tsx). */
	| (Base & {type: 'chargement'; fin: Ancre; etapes: {texte: string; a: Ancre}[]; x?: number; y?: number; w?: number; h?: number; titre?: string})
	/** Écrans de saisie Grandimi plein écran (sexe, âge, taille et poids, parents), un par ancre (src/episode/FormulaireGrandimi.tsx). */
	| (Base & {type: 'formulaire'; fin: Ancre; ecrans: {titre: string; a: Ancre; options?: string[]; choisi?: number; roues?: {label: string; valeurs: string[]; choisi: number}[]}[]});

/** Silhouettes à l'échelle : parents, personne aujourd'hui, personne adulte qui grandit. */
export type Famille = {
	titre?: string;
	personnes: {nom: string; taille: number; couleur?: string}[];
	futur: {nom: string; depart: number; estimee: number; optimisee: number; aOptimisee: Ancre; gain: string; aGain: Ancre};
};

export type Plan = {
	nom: string;
	debut: Ancre;
	/** Entrée du plan. glisse / rebond / secousse : mouvements mesurés sur la référence 7436214342510513439 ;
	    bascule : entrée inclinée qui se redresse (référence 7444371749753408810). */
	transition?: 'coupe' | 'whip' | 'flash' | 'flash-blanc' | 'glisse' | 'rebond' | 'lumiere' | 'bascule' | 'etire' | 'radial' | 'lumiere-rouge' | 'jaune-glisse' | 'glitch';
	/** Sortie du plan : lumiere = lumière jaune qui envahit l'image sur les dernières frames ;
	    blanc = fondu au blanc sur les 4 dernières frames (la fin s'enchaîne avec l'accroche dessinée quand la vidéo reboucle). */
	/** jaune / glitch / zoom-flou / radial-fin : sorties mesurées sur la référence « Steve » (src/episode/TransitionsSteve.tsx). */
	sortie?: 'lumiere' | 'lumiere-forte' | 'blanc' | 'noir' | 'jaune' | 'glitch' | 'zoom-flou' | 'radial-fin';
	/** Effets ponctuels sur tout le plan (secousse gauche-droite). */
	effets?: {type: 'secousse' | 'flash'; a: Ancre; couleur?: string}[];
	famille?: Famille;
	/** true : la caméra peut sortir de l'image (cadrer une carte au même endroit que la référence). */
	libre?: boolean;
	/** papier : photos de papier froissé ; topo : courbes de niveau animées (src/episode/TopoAnime.tsx). */
	fond?: 'papier' | 'topo';
	/** Fond topo : zoom de départ (la caméra arrive à 1 en `d` frames) et coup de zoom flou à `coup`. */
	topo?: {zoomDe?: number; d?: number; coup?: Ancre};
	/** Photos de papier qui alternent (sinon papier généré). */
	papiers?: string[];
	image?: string;
	/** Accroche dessinée « taille moyenne » : barre qui monte jusqu'à `cm`, puis carte de France à `carte`,
	    silhouette en pointillés à `moyenne`, la carte bat à `france`, « ? » à `question` (src/episode/HookTaille.tsx). */
	hookTaille?: {cm: number; carte: Ancre; moyenne: Ancre; france?: Ancre; question?: Ancre; direct?: boolean;
		/** Plan 3 glowup : règle et repères rouges à `regle`, repère posé à `potentiel`, grand bonhomme lumineux à `finale`. */
		regle?: Ancre; potentiel?: Ancre; finale?: Ancre};
	/** Accroche dessinée « on prédit votre potentiel… à partir de vos commentaires » (src/episode/HookCommentaires.tsx). */
	hookCommentaires?: {actuelle: number; cible: number; potentiel: Ancre; commentaires: Ancre; bulles: {nom: string; texte: string; couleur: string}[]};
	/** Écran de résultats Grandimi animé (src/episode/Dashboard.tsx) : caméra, lignes qui s'élargissent, flèches, ballon. */
	dashboard?: {
		donnees: import('./Dashboard').DashData;
		cams: {a: Ancre; cx: number; cy: number; z: number; d: number; courbe: 'avant' | 'arriere'}[];
		pops: {ligne: import('./Dashboard').Ligne; a: Ancre; d: number; fin: Ancre; dFin: number; echelle: number}[];
		fleches: {sens: 'bas' | 'haut'; x: number; pointe: number; a: Ancre; d: number; fin: Ancre; dFin: number}[];
		ballon?: {fichier: string; a: Ancre; fin: Ancre};
		/** La taille prédite reste cachée (« ??? cm ») jusqu'à cette ancre. */
		revele?: Ancre;
		/** Page vue dans Safari : barre d'adresse avec ce lien en haut (diapos pub). */
		url?: string;
		/** logo : en-tête « GRANDIMI » + icône, sans barre d'état (diapos format Taller). */
		entete?: 'logo';
	};
	/** Suite d'images plein écran (une par frame, la dernière reste affichée), à la place de `image`. */
	sequence?: string[];
	fondCouleur?: string;
	camera?: Camera[];
	/** Poussée lente et continue de tout le plan : l'échelle passe de 1 à 1 + pousse sur la durée du plan (pas d'image figée). */
	pousse?: number;
	elements?: Element[];
	sons?: {a: Ancre; son: string; volume?: number}[];
};

export type Episode = {
	partie: number;
	/** Carte « Réponse au commentaire de … » affichée par-dessus les plans (src/episode/CarteCommentaire.tsx). */
	/** Titre fixe en haut de l'écran, style texte TikTok (référence rayan.taller : « 1m60 à 13 ans 🙊💊 »). */
	titre?: {texte: string; de?: Ancre; a?: Ancre; y?: number; taille?: number};
	/** ligne : ligne de commentaire TikTok pleine largeur (référence rayan.taller). */
	carteCommentaire?: {nom: string; texte: string; de: Ancre; a: Ancre; haut?: boolean; x?: number; y?: number; ligne?: boolean; w?: number;
		/** Carte « Réponse au commentaire » penchée des vidéos Taller : hauteur et rotation (degrés). */
		reponse?: {h: number; rotation: number; modele?: 'parsa'; avatar?: string}};
	/** sec : transitions deux fois plus courtes et flou de mouvement sur les mouvements de caméra (demande du 20/10). */
	rythme?: 'sec';
	/** false : pas de légère poussée de caméra entre les mouvements (défaut : true). */
	deriveCamera?: boolean;
	/** false : pas de whoosh automatique sur les mouvements de caméra et les secousses (préférence 17/10). */
	sonsMouvements?: boolean;
	voice: string;
	speed: number;
	lines: {id: string; pause: number; text: string}[];
	musique?: {fichier: string; volume: number};
	images: Record<string, ImageRef>;
	zones: Record<string, Zone>;
	plans: Plan[];
	sousTitres: {
		motsCles: string[];
		/** motsMax / carMax : taille des groupes de mots ; poids : graisse de la police (800 par défaut) ;
		    motsCles: false : pas de pastille orange dans cette fenêtre. */
		/** style « condense » : Barlow Condensed blanche en majuscules, mot prononcé surligné dans une pastille rouge. */
		/** verts : mots affichés en vert lumineux (« NOT COOKED », « POTENTIAL ANALYZED » de la référence Steve). */
		/** police : famille CSS (ex. « Montserrat ») ; couleur : couleur du texte. */
		fenetres: {de: Ancre; a: Ancre; y: number; taille: number; majuscules?: boolean; style?: 'condense'; verts?: string[]; police?: string; couleur?: string; reprise?: boolean; motsMax?: number; carMax?: number; poids?: number; contour?: number; motsCles?: boolean; pop?: boolean}[];
	};
};
