import {useCurrentFrame} from 'remotion';
import {lines} from '../timing';
import {C, FONT} from '../theme';

type W = {w: string; f: number};

/** Découpe une phrase en groupes courts (≤ 3 mots, ≤ 20 caractères), façon sous-titres TikTok. */
const chunk = (words: W[]): W[][] => {
	const out: W[][] = [];
	let cur: W[] = [];
	for (const w of words) {
		const len = cur.map((x) => x.w).join(' ').length + w.w.length;
		if (cur.length && (cur.length >= 3 || len > 20)) {
			out.push(cur);
			cur = [];
		}
		cur.push(w);
		if (/[,.:;]$/.test(w.w)) {
			out.push(cur);
			cur = [];
		}
	}
	if (cur.length) out.push(cur);
	return out;
};

const CHUNKS = lines.map((l) => ({end: l.from + l.duration + 6, chunks: chunk(l.words)}));

export const Captions: React.FC<{y?: number}> = ({y = 1400}) => {
	const f = useCurrentFrame();
	const l = CHUNKS.find((c) => f >= c.chunks[0][0].f && f < c.end);
	if (!l) return null;
	const current = [...l.chunks].reverse().find((c) => f >= c[0].f);
	if (!current) return null;
	const active = [...current].reverse().find((w) => f >= w.f);
	return (
		<div
			style={{
				position: 'absolute',
				top: y,
				left: 70,
				right: 70,
				textAlign: 'center',
				fontFamily: FONT,
				fontWeight: 900,
				fontSize: 66,
				lineHeight: 1.1,
				letterSpacing: -1,
			}}
		>
			{current.map((w, i) => {
				const on = w === active;
				const s = on ? 1 + 0.12 * Math.max(0, 1 - (f - w.f) / 5) : 1;
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							margin: '0 10px',
							color: on ? C.orange : C.ink,
							transform: `scale(${s})`,
						}}
					>
						{w.w.replace(/[,.:;]$/, '')}
					</span>
				);
			})}
		</div>
	);
};
