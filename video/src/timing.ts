import timeline from './timeline.json';

export type Line = (typeof timeline.lines)[number];

export const lines = timeline.lines;
export const line = (id: string): Line => {
	const l = lines.find((x) => x.id === id);
	if (!l) throw new Error(`Ligne inconnue : ${id}`);
	return l;
};

const clean = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9']/g, '');

/** Frame absolue du n-ième mot de la ligne qui commence par `word`. */
export const wordAt = (id: string, word: string, nth = 0): number => {
	const target = clean(word);
	const hits = line(id).words.filter((w) => clean(w.w).startsWith(target));
	if (!hits[nth]) throw new Error(`Mot introuvable : ${word} dans ${id}`);
	return hits[nth].f;
};
