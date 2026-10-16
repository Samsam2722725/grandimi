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

export type Camera = {a?: Ancre; zone?: string; x?: number; y?: number; z?: number; duree?: number | 'fin'; son?: string | null; volume?: number};

type Base = {a: Ancre; son?: string; volume?: number};
export type Element =
	| (Base & {type: 'image'; fichier: string; x: number; y: number; w: number; h: number; fin?: Ancre; effet?: 'pop' | 'pop-balance' | 'revele-bas'; rebond?: boolean; ecran?: boolean})
	| (Base & {type: 'trait'; d: string; tete?: string; couleur?: string; epaisseur?: number; duree?: number; fin?: Ancre})
	| (Base & {type: 'texte'; texte: string; y: number; taille: number; couleur?: string; contour?: number; contourCouleur?: string; poids?: number; fond?: string; amorti?: number; effet?: 'pop' | 'pop-balance'; fin?: Ancre})
	| (Base & {type: 'tape'; texte: string; y: number; taille: number; parLettre?: number; couleur?: string; contour?: number});

export type Plan = {
	nom: string;
	debut: Ancre;
	/** Entrée du plan. glisse / rebond / secousse : mouvements mesurés sur la référence 7436214342510513439. */
	transition?: 'coupe' | 'whip' | 'flash' | 'flash-blanc' | 'glisse' | 'rebond' | 'lumiere';
	/** Sortie du plan : lumiere = lumière jaune qui envahit l'image sur les dernières frames. */
	sortie?: 'lumiere';
	/** Effets ponctuels sur tout le plan (secousse gauche-droite). */
	effets?: {type: 'secousse'; a: Ancre}[];
	/** true : la caméra peut sortir de l'image (cadrer une carte au même endroit que la référence). */
	libre?: boolean;
	fond?: 'papier';
	/** Photos de papier qui alternent (sinon papier généré). */
	papiers?: string[];
	image?: string;
	fondCouleur?: string;
	camera?: Camera[];
	elements?: Element[];
	sons?: {a: Ancre; son: string; volume?: number}[];
};

export type Episode = {
	partie: number;
	/** false : pas de légère poussée de caméra entre les mouvements (défaut : true). */
	deriveCamera?: boolean;
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
		fenetres: {de: Ancre; a: Ancre; y: number; taille: number; majuscules?: boolean; motsMax?: number; carMax?: number; poids?: number; contour?: number; motsCles?: boolean; pop?: boolean}[];
	};
};
