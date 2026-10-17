import timeline from './timeline.json';

export type Timeline = {
	fps: number;
	totalFrames: number;
	/** Voix enregistrée en un seul fichier (sinon un fichier par ligne). */
	audio?: string;
	lines: {id: string; text: string; from: number; duration: number; words: {w: string; f: number}[]}[];
};
export type Line = Timeline['lines'][number];

const clean = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9']/g, '');

export const makeTiming = (tl: Timeline) => {
	const line = (id: string): Line => {
		const l = tl.lines.find((x) => x.id === id);
		if (!l) throw new Error(`Ligne inconnue : ${id}`);
		return l;
	};
	/** Frame absolue du n-ième mot de la ligne qui commence par `word`. */
	const wordAt = (id: string, word: string, nth = 0): number => {
		const target = clean(word);
		const hits = line(id).words.filter((w) => clean(w.w).startsWith(target));
		if (!hits[nth]) throw new Error(`Mot introuvable : ${word} dans ${id}`);
		return hits[nth].f;
	};
	return {lines: tl.lines, line, wordAt};
};

export const {lines, line, wordAt} = makeTiming(timeline);
