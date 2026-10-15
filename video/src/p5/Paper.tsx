import {useCurrentFrame} from 'remotion';
import {pop} from '../anim';
import {P5} from './style';

/** Papier froissé généré (bruit + éclairage), sans image externe. */
export const Paper: React.FC = () => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		<filter id="froisse" x="0" y="0" width="100%" height="100%">
			<feTurbulence type="fractalNoise" baseFrequency="0.0065 0.009" numOctaves={5} seed={11} result="bruit" />
			<feDiffuseLighting in="bruit" lightingColor="#f2f2f0" surfaceScale={9} result="lumiere">
				<feDistantLight azimuth={225} elevation={42} />
			</feDiffuseLighting>
			<feColorMatrix
				in="lumiere"
				type="matrix"
				values="0.33 0.33 0.33 0 0.06  0.33 0.33 0.33 0 0.06  0.33 0.33 0.33 0 0.06  0 0 0 1 0"
			/>
		</filter>
		<rect width={1080} height={1920} filter="url(#froisse)" />
	</svg>
);

/** Texte tapé lettre par lettre, style sous-titres jaunes à contour noir. */
export const Typed: React.FC<{text: string; at: number; perLetter?: number; y: number; size: number}> = ({
	text,
	at,
	perLetter = 2,
	y,
	size,
}) => {
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
				WebkitTextStroke: `${size * 0.07}px #000`,
			}}
		>
			{text.slice(0, n)}
			<span style={{opacity: 0}}>{text.slice(n)}</span>
		</div>
	);
};
