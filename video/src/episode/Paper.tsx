import {useCurrentFrame} from 'remotion';
import {pop} from '../anim';
import {P5} from './style';

/**
 * Papier froissé généré (bruit + éclairage), sans image externe. Le froissage change
 * toutes les `saccade` frames, comme les clips de papier de 0,2-0,3 s de l'original.
 */
export const Paper: React.FC<{saccade?: number}> = ({saccade = 7}) => {
	const f = useCurrentFrame();
	const seed = 11 + Math.floor(Math.max(0, f) / saccade);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<filter id={`froisse-${seed}`} x="0" y="0" width="100%" height="100%">
				<feTurbulence type="fractalNoise" baseFrequency="0.0065 0.009" numOctaves={5} seed={seed} result="bruit" />
				<feDiffuseLighting in="bruit" lightingColor="#f2f2f0" surfaceScale={9} result="lumiere">
					<feDistantLight azimuth={225} elevation={42} />
				</feDiffuseLighting>
				<feColorMatrix
					in="lumiere"
					type="matrix"
					values="0.33 0.33 0.33 0 0.06  0.33 0.33 0.33 0 0.06  0.33 0.33 0.33 0 0.06  0 0 0 1 0"
				/>
			</filter>
			<rect width={1080} height={1920} filter={`url(#froisse-${seed})`} />
		</svg>
	);
};

/** Texte tapé lettre par lettre, style sous-titres jaunes à contour noir. */
export const Typed: React.FC<{
	text: string;
	at: number;
	perLetter?: number;
	y: number;
	size: number;
	color?: string;
	stroke?: number;
	/** Curseur « | » qui clignote pendant la frappe (référence partie 11). */
	curseur?: boolean;
	/** Pastille derrière le texte (ex. violet #8100fe, texte blanc sans contour). */
	fond?: string;
	police?: string;
	poids?: number;
}> = ({text, at, perLetter = 2, y, size, color, stroke, curseur, fond, police, poids}) => {
	const f = useCurrentFrame();
	const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / perLetter) + 1));
	const s = 0.9 + 0.1 * pop(f, at);
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: y,
				textAlign: 'center',
				transform: `scale(${s})`,
				...P5.caption,
				fontSize: size,
				color: color ?? P5.yellow,
				WebkitTextStroke: `${stroke ?? size * 0.07}px #000`,
				...(police ? {fontFamily: `'${police}', sans-serif`, fontWeight: poids ?? 800} : {}),
				...(fond ? {textShadow: 'none'} : {}),
			}}
		>
			{fond ? (
				<span style={{background: fond, borderRadius: size * 0.28, padding: `${size * 0.12}px ${size * 0.3}px ${size * 0.16}px`, display: 'inline-block'}}>
					{text.slice(0, n)}
					{curseur && n < text.length && Math.floor((f - at) / 4) % 2 === 0 ? <span style={{fontWeight: 300}}>|</span> : null}
					<span style={{opacity: 0}}>{text.slice(n)}</span>
				</span>
			) : (
				<>
					{text.slice(0, n)}
					{curseur && n < text.length && Math.floor((f - at) / 4) % 2 === 0 ? <span style={{fontWeight: 300}}>|</span> : null}
					<span style={{opacity: 0}}>{text.slice(n)}</span>
				</>
			)}
		</div>
	);
};
