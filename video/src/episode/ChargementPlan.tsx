import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Écran « Création de ton plan… » (référence rayan.taller, p14-rayan, 7,5-14 s) aux couleurs Grandimi :
 * téléphone qui glisse depuis la droite, rond lumineux avec silhouette, barre de progression,
 * étapes qui passent de « en cours » (anneau qui tourne) à « faite » (coche orange) à leur ancre.
 */
const OR = '#ff5a1f';

export const ChargementPlan: React.FC<{
	at: number;
	fin: number;
	etapes: {texte: string; a: number}[];
	x: number;
	y: number;
	w: number;
	h: number;
}> = ({at, fin, etapes, x, y, w, h}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const entree = interpolate(f, [at, at + 9], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.3))});
	const pct = Math.round(interpolate(f, [at, fin], [4, 100], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)}));
	const pulse = 1 + 0.04 * Math.sin((f - at) / 4.5);
	const k = w / 470;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: w,
				height: h,
				transform: `translateX(${entree * 640}px)`,
				background: '#0c0c0c',
				borderRadius: 44 * k,
				border: '2px solid #262626',
				boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
				fontFamily: FONT,
				color: '#fff',
				overflow: 'hidden',
			}}
		>
			<div style={{display: 'flex', justifyContent: 'space-between', padding: `${18 * k}px ${30 * k}px`, fontSize: 22 * k, fontWeight: 700}}>
				<span style={{background: '#e2362b', borderRadius: 12 * k, padding: `${2 * k}px ${12 * k}px`}}>15:35</span>
				<span>5G ▮</span>
			</div>
			<div style={{textAlign: 'center', fontSize: 34 * k, fontWeight: 800, marginTop: 24 * k}}>Création de ton plan…</div>
			<div style={{display: 'flex', justifyContent: 'center', marginTop: 40 * k}}>
				<div
					style={{
						width: 190 * k,
						height: 190 * k,
						borderRadius: '50%',
						background: `radial-gradient(circle, ${OR} 0%, #c93d0c 55%, #3a1405 100%)`,
						boxShadow: `0 0 ${60 * k}px ${OR}88`,
						transform: `scale(${pulse})`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<svg width={70 * k} height={110 * k} viewBox="0 0 70 110">
						<circle cx={35} cy={13} r={12} fill="#fff" />
						<path d="M17 30 H53 Q58 30 58 36 V66 H50 V106 H38 V72 H32 V106 H20 V66 H12 V36 Q12 30 17 30 Z" fill="#fff" />
					</svg>
				</div>
			</div>
			<div style={{display: 'flex', justifyContent: 'space-between', margin: `${46 * k}px ${30 * k}px ${10 * k}px`, fontSize: 20 * k, color: '#9a9a9a'}}>
				<span>Progression</span>
				<span style={{color: '#fff', fontWeight: 700}}>{pct} %</span>
			</div>
			<div style={{margin: `0 ${30 * k}px`, height: 12 * k, borderRadius: 6 * k, background: '#262626'}}>
				<div style={{width: `${pct}%`, height: '100%', borderRadius: 6 * k, background: `linear-gradient(90deg, ${OR}, #ff9a4a)`}} />
			</div>
			<div style={{margin: `${30 * k}px ${24 * k}px 0`, display: 'flex', flexDirection: 'column', gap: 14 * k}}>
				{etapes.map((e, i) => {
					const debut = i === 0 ? at : etapes[i - 1].a;
					const fait = f >= e.a;
					const enCours = !fait && f >= debut;
					const coche = interpolate(f, [e.a, e.a + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
					return (
						<div
							key={i}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 16 * k,
								padding: `${16 * k}px ${18 * k}px`,
								borderRadius: 18 * k,
								background: fait || enCours ? 'rgba(255,90,31,0.16)' : '#161616',
								color: fait || enCours ? '#fff' : '#555',
								fontSize: 23 * k,
								fontWeight: 600,
							}}
						>
							<div
								style={{
									width: 34 * k,
									height: 34 * k,
									borderRadius: '50%',
									flexShrink: 0,
									border: fait ? 'none' : `${4 * k}px solid ${enCours ? OR : '#333'}`,
									borderTopColor: enCours ? 'transparent' : undefined,
									transform: enCours ? `rotate(${(f - debut) * 24}deg)` : undefined,
									background: fait ? OR : 'transparent',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxSizing: 'border-box',
								}}
							>
								{fait ? (
									<svg width={20 * k} height={20 * k} viewBox="0 0 20 20" style={{transform: `scale(${coche})`}}>
										<path d="M4 10.5 L8.5 15 L16 6" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								) : null}
							</div>
							<span style={{flex: 1}}>{e.texte}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
