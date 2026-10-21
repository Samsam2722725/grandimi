import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/*
 * Transitions recopiées image par image de la référence « Steve » (references/p12-steve, 30 i/s).
 *   entrée jaune-glisse : l'écran arrive de la droite, flou horizontal, voile jaune puis orangé (images 99-103),
 *                         puis petit va-et-vient horizontal (104-112).
 *   sortie jaune        : voile jaune sur les 4 dernières images du papier (95-98).
 *   sortie glitch       : voiles orange / orange vif / jaune sur les 10 dernières images (770-779).
 *   entrée glitch       : jaune, orangé, l'image glisse de la gauche en zoomant ×0,86 → ×1, voile rose puis jaune,
 *                         rebond à gauche (780-792).
 *   sortie zoom-flou    : zoom qui accélère sur la dernière seconde puis flou (836-867).
 *   sortie radial       : flou et zoom de fin (1015-1021).
 */

type Voile = {c: string; o: number; mode?: React.CSSProperties['mixBlendMode']};

const VoileView: React.FC<{v?: Voile}> = ({v}) =>
	v ? <AbsoluteFill style={{background: v.c, opacity: v.o, mixBlendMode: v.mode ?? 'normal'}} /> : null;

const kf = (f: number, xs: number[], ys: number[]) => interpolate(f, xs, ys, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const EntreeJauneGlisse: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const x = kf(f, [0, 1, 2, 3, 4, 5, 6, 7, 8, 10], [320, 210, 70, 22, 0, -36, -14, 12, 5, 0]);
	const flou = kf(f, [0, 2, 4], [48, 22, 0]);
	const voiles: Voile[] = [
		{c: '#ffea3d', o: 0.94},
		{c: '#ffe93a', o: 0.9},
		{c: '#ffb21e', o: 0.62, mode: 'screen'},
		{c: '#ffd23a', o: 0.5, mode: 'screen'},
		{c: '#ffd23a', o: 0.12, mode: 'screen'},
	];
	return (
		<AbsoluteFill>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<filter id="flou-h">
					<feGaussianBlur stdDeviation={`${flou} 0`} />
				</filter>
			</svg>
			<AbsoluteFill style={{transform: `translateX(${x}px)`, filter: flou > 0.5 ? 'url(#flou-h)' : undefined}}>{children}</AbsoluteFill>
			<VoileView v={voiles[f]} />
		</AbsoluteFill>
	);
};

export const SortieJaune: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	if (f < dur - 4) return null;
	return (
		<>
			<AbsoluteFill style={{background: '#fff36a', mixBlendMode: 'multiply'}} />
			<AbsoluteFill style={{background: '#fff8b0', opacity: 0.35, mixBlendMode: 'screen'}} />
		</>
	);
};

export const SortieGlitch: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const i = f - (dur - 10);
	if (i < 0) return null;
	const v: Voile =
		i < 2 ? {c: '#ffa21e', o: 0.82, mode: 'screen'} : i === 2 ? {c: '#ff5a00', o: 0.88, mode: 'screen'} : {c: '#ffe93a', o: 0.86 + 0.01 * (i - 3)};
	return <VoileView v={v} />;
};

export const EntreeGlitch: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const x = kf(f, [0, 1, 2, 3, 4, 5, 8, 9, 10, 13], [-560, -480, -328, -174, -58, 0, 0, -70, -40, 0]);
	const s = kf(f, [0, 1, 5], [0.86, 0.86, 1]);
	const voiles: (Voile | undefined)[] = [
		{c: '#ffe93a', o: 0.86},
		{c: '#ff7a1e', o: 0.6, mode: 'screen'},
		{c: '#ff2a2a', o: 0.28, mode: 'multiply'},
		{c: '#ff2a2a', o: 0.18, mode: 'multiply'},
		{c: '#ff2a2a', o: 0.1, mode: 'multiply'},
		undefined,
		{c: '#ff4a6a', o: 0.5, mode: 'screen'},
		{c: '#ffe93a', o: 0.75},
	];
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `translateX(${x}px) scale(${s})`}}>{children}</AbsoluteFill>
			<VoileView v={voiles[f]} />
		</AbsoluteFill>
	);
};

export const SortieZoomFlou: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 32, dur - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
	const z = 1 + 0.12 * t + (f >= dur - 1 ? 0.1 : 0);
	const flou = interpolate(f, [dur - 5, dur - 1], [0, 12], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{transform: `scale(${z})`, filter: flou > 0.4 ? `blur(${flou}px)` : undefined}}>{children}</AbsoluteFill>;
};

export const SortieRadial: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 7, dur - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
	return (
		<AbsoluteFill style={{transform: `scale(${1 + 0.18 * t})`, filter: t > 0.02 ? `blur(${14 * t}px) contrast(${1 - 0.35 * t})` : undefined}}>
			{children}
		</AbsoluteFill>
	);
};

/** Flash orange puis jaune sur 6 images, l'écran reste visible dessous (images 630-635). */
export const FlashOrangeJaune: React.FC = () => {
	const f = useCurrentFrame();
	const v: (Voile | undefined)[] = [
		{c: '#ff7a10', o: 0.8, mode: 'screen'},
		{c: '#ff7a10', o: 0.8, mode: 'screen'},
		{c: '#ff4a00', o: 0.85, mode: 'screen'},
		{c: '#ffe93a', o: 0.85, mode: 'screen'},
		{c: '#ffe93a', o: 0.85, mode: 'screen'},
		{c: '#ffe93a', o: 0.6, mode: 'screen'},
	];
	return <VoileView v={v[f]} />;
};
