import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/*
 * Transitions « tendance » (demande du 02/11 : plus visibles, fortes, mais absolument fluides).
 * Chaque transition est une paire sortie + entrée : le mouvement continue d'un plan à l'autre (même sens, même
 * vitesse au moment de la coupe), ce qui donne l'impression d'un seul geste.
 *   zoom : le plan sortant plonge en avant (×1 → ×1,7) avec flou sur 7 images ; le plan entrant arrive de très près
 *          (×1,7), éclair blanc léger (0,15 → 0 en 3 images), et se pose avec un léger rebond (×0,985) en 10 images.
 *   whip : balayage horizontal : le plan sortant file à gauche (−520 px) en 6 images, le plan entrant arrive de la
 *          droite (+520 px, bord à bord ; sur deux écrans sombres l'image de coupe reste sombre) avec un flou de mouvement, dépasse un peu puis se cale.
 */

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const FlouH: React.FC<{id: string; px: number}> = ({id, px}) => (
	<svg width={0} height={0} style={{position: 'absolute'}}>
		<filter id={id} x="-20%" y="0" width="140%" height="100%">
			<feGaussianBlur stdDeviation={`${px} 0`} />
		</filter>
	</svg>
);

export const EntreeZoom: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const z = interpolate(f, [0, 3, 6, 10], [1.7, 1.12, 0.985, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const flou = interpolate(f, [0, 4, 7], [16, 4, 0], clamp);
	const blanc = interpolate(f, [0, 1, 3], [0.15, 0.06, 0], clamp); // 0,4 donnait un à-coup sur fond sombre (audit 03/11)
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${z})`, filter: flou > 0.3 ? `blur(${flou}px)` : undefined}}>{children}</AbsoluteFill>
			{blanc > 0.01 ? <AbsoluteFill style={{background: '#fff', opacity: blanc}} /> : null}
		</AbsoluteFill>
	);
};

export const SortieZoom: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 7, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const blanc = 0;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${1 + 0.7 * t})`, filter: t > 0.02 ? `blur(${16 * t}px)` : undefined}}>{children}</AbsoluteFill>
			{blanc > 0.01 ? <AbsoluteFill style={{background: '#fff', opacity: blanc}} /> : null}
		</AbsoluteFill>
	);
};

export const EntreeWhip: React.FC<{id: string; children: React.ReactNode}> = ({id, children}) => {
	const f = useCurrentFrame();
	const x = interpolate(f, [0, 3, 6, 10], [520, 90, -24, 0], {...clamp, easing: Easing.out(Easing.cubic)});
	const flou = interpolate(f, [0, 3, 6], [60, 18, 0], clamp);
	return (
		<AbsoluteFill>
			{flou > 0.5 ? <FlouH id={`whip-in-${id}`} px={flou} /> : null}
			<AbsoluteFill style={{transform: `translateX(${x}px)`, filter: flou > 0.5 ? `url(#whip-in-${id})` : undefined}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};

export const SortieWhip: React.FC<{id: string; dur: number; children: React.ReactNode}> = ({id, dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 6, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const flou = 60 * t;
	return (
		<AbsoluteFill>
			{flou > 0.5 ? <FlouH id={`whip-out-${id}`} px={flou} /> : null}
			<AbsoluteFill style={{transform: `translateX(${-520 * t}px)`, filter: flou > 0.5 ? `url(#whip-out-${id})` : undefined}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};

/*
 * Glitch de Taller partie 30 (17,77-18,2 s, relevé image par image le 05/11) :
 *   sortie « onde »  : les 3 dernières images du plan se déforment en vagues (déplacement par bruit).
 *   entrée « blocs » : 2 images de bandes du nouvel écran décalées en tous sens avec traînées verticales, 1 image de
 *                      l'écran décalé vers le haut, puis arrivée zoomée (×1,39 → ×1) avec flou vertical qui s'efface (8 images).
 */
export const SortieOnde: React.FC<{id: string; dur: number; children: React.ReactNode}> = ({id, dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 4, dur - 1], [0, 1], clamp);
	if (t <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;
	return (
		<AbsoluteFill>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<filter id={`onde-${id}`} x="-10%" y="-10%" width="120%" height="120%">
					<feTurbulence type="fractalNoise" baseFrequency="0.004 0.02" numOctaves={2} seed={f} result="b" />
					<feDisplacementMap in="SourceGraphic" in2="b" scale={70 * t} xChannelSelector="R" yChannelSelector="G" />
				</filter>
			</svg>
			<AbsoluteFill style={{filter: `url(#onde-${id})`}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};

const BANDES = [
	[0, 0.14, -180, -40],
	[0.14, 0.31, 120, 260],
	[0.31, 0.46, -60, -330],
	[0.46, 0.63, 220, 90],
	[0.63, 0.8, -140, -220],
	[0.8, 1, 60, 300],
];

export const EntreeGlitchBlocs: React.FC<{id: string; couleur?: string; children: React.ReactNode}> = ({id, couleur = '#ff5a1f', children}) => {
	const f = useCurrentFrame();
	const flouV = (px: number) => (
		<svg width={0} height={0} style={{position: 'absolute'}}>
			<filter id={`bv-${id}-${f}`} x="0" y="-20%" width="100%" height="140%">
				<feGaussianBlur stdDeviation={`0 ${px}`} />
			</filter>
		</svg>
	);
	if (f < 2) {
		return (
			<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
				{flouV(22)}
				{BANDES.map(([a, b, dx, dy], i) => (
					<AbsoluteFill key={i} style={{clipPath: `inset(${a * 100}% 0 ${(1 - b) * 100}% 0)`}}>
						<AbsoluteFill style={{transform: `translate(${f ? -dx : dx}px, ${f ? dy * 0.6 : dy}px)`, filter: `url(#bv-${id}-${f})`}}>{children}</AbsoluteFill>
						{i % 2 === f ? <AbsoluteFill style={{background: couleur, opacity: 0.55, mixBlendMode: 'screen'}} /> : null}
					</AbsoluteFill>
				))}
			</AbsoluteFill>
		);
	}
	if (f < 3) {
		return (
			<AbsoluteFill style={{background: '#000'}}>
				{flouV(14)}
				<AbsoluteFill style={{transform: 'translateY(-55%) scale(1.15)', filter: `url(#bv-${id}-${f})`}}>{children}</AbsoluteFill>
			</AbsoluteFill>
		);
	}
	const k = f - 3;
	const z = interpolate(k, [0, 8], [1.39, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const flou = interpolate(k, [0, 6], [12, 0], clamp);
	return (
		<AbsoluteFill>
			{flou > 0.4 ? flouV(flou) : null}
			<AbsoluteFill style={{transform: `scale(${z})`, filter: flou > 0.4 ? `url(#bv-${id}-${f})` : undefined}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};
