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
	| (Base & {type: 'image'; fichier: string; x: number; y: number; w: number; h: number; fin?: Ancre; effet?: 'pop' | 'pop-balance' | 'revele-bas'})
	| (Base & {type: 'trait'; d: string; tete?: string; couleur?: string; epaisseur?: number; duree?: number})
	| (Base & {type: 'texte'; texte: string; y: number; taille: number; couleur?: string; contour?: number; fond?: string; amorti?: number; effet?: 'pop' | 'pop-balance'})
	| (Base & {type: 'tape'; texte: string; y: number; taille: number; parLettre?: number});

export type Plan = {
	nom: string;
	debut: Ancre;
	transition?: 'coupe' | 'whip' | 'flash' | 'flash-blanc';
	fond?: 'papier';
	image?: string;
	fondCouleur?: string;
	camera?: Camera[];
	elements?: Element[];
	sons?: {a: Ancre; son: string; volume?: number}[];
};

export type Episode = {
	partie: number;
	voice: string;
	speed: number;
	lines: {id: string; pause: number; text: string}[];
	musique?: {fichier: string; volume: number};
	images: Record<string, ImageRef>;
	zones: Record<string, Zone>;
	plans: Plan[];
	sousTitres: {
		motsCles: string[];
		fenetres: {de: Ancre; a: Ancre; y: number; taille: number; majuscules?: boolean}[];
	};
};
