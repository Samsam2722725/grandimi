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
	| (Base & {type: 'texte'; texte: string; y: number; taille: number; couleur?: string; contour?: number; contourCouleur?: string; poids?: number; fond?: string; amorti?: number; effet?: 'pop' | 'pop-balance'; fin?: Ancre; lueur?: string})
	| (Base & {type: 'tape'; texte: string; y: number; taille: number; parLettre?: number; couleur?: string; contour?: number})
	/** Compteur qui défile de `de` à `vers` et se pose sur `arrivee` (révélation avec suspense). */
	| (Base & {type: 'compteur'; de: number; vers: number; arrivee: Ancre; fin?: Ancre; suffixe?: string; y: number; taille: number; couleur?: string; voile?: boolean})
	/** Fausse zone de commentaire TikTok qui s'écrit toute seule. */
	| (Base & {type: 'commentaire'; texte: string; y: number; parLettre?: number; envoi?: Ancre});

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
	transition?: 'coupe' | 'whip' | 'flash' | 'flash-blanc' | 'glisse' | 'rebond' | 'lumiere' | 'bascule';
	/** Sortie du plan : lumiere = lumière jaune qui envahit l'image sur les dernières frames ;
	    blanc = fondu au blanc sur les 4 dernières frames (la fin s'enchaîne avec l'accroche dessinée quand la vidéo reboucle). */
	sortie?: 'lumiere' | 'blanc';
	/** Effets ponctuels sur tout le plan (secousse gauche-droite). */
	effets?: {type: 'secousse'; a: Ancre}[];
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
	hookTaille?: {cm: number; carte: Ancre; moyenne: Ancre; france?: Ancre; question?: Ancre};
	/** Accroche dessinée « on prédit votre potentiel… à partir de vos commentaires » (src/episode/HookCommentaires.tsx). */
	hookCommentaires?: {actuelle: number; cible: number; potentiel: Ancre; commentaires: Ancre; bulles: {nom: string; texte: string; couleur: string}[]};
	/** Suite d'images plein écran (une par frame, la dernière reste affichée), à la place de `image`. */
	sequence?: string[];
	fondCouleur?: string;
	camera?: Camera[];
	elements?: Element[];
	sons?: {a: Ancre; son: string; volume?: number}[];
};

export type Episode = {
	partie: number;
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
		fenetres: {de: Ancre; a: Ancre; y: number; taille: number; majuscules?: boolean; style?: 'condense'; motsMax?: number; carMax?: number; poids?: number; contour?: number; motsCles?: boolean; pop?: boolean}[];
	};
};
