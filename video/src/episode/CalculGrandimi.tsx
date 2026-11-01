import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {BarreSafari} from './Dashboard';

/*
 * Écran « calcul » du site grandimi.com (enregistrement d'écran du 31/10) redessiné net en 1080 × 1920 : anneau
 * orange lumineux qui se remplit de 0 à 100 % autour d'un pourcentage, fond pointillé dans l'anneau, puis cinq
 * étapes qui se cochent l'une après l'autre (l'étape en cours en orange, les étapes faites sur fond brun avec un
 * liseré orange et une coche pleine).
 */
const OR = '#ff5a1f';
const OR2 = '#ff9a2e';
const ETAPES = ['Ta taille adulte estimée', 'Ton sommeil', 'Ton sport et ta posture', 'Ton alimentation', 'Ton plan personnalisé'];

export const CalculGrandimi: React.FC<{at: number; fin: number; url?: string}> = ({at, fin, url}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const d = Math.max(10, fin - at - 4);
	const p = interpolate(f, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
	const pct = Math.round(100 * p);
	const entree = interpolate(f, [at, at + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const haut = url ? 172 : 0;
	const R = 190;
	const C = 2 * Math.PI * R;
	const cx = 540;
	const cy = haut + 420;
	return (
		<AbsoluteFill style={{background: '#0d0a0d', fontFamily: FONT, color: '#fff'}}>
			<div style={{position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 40}px)`}}>
				{/* halo */}
				<div
					style={{
						position: 'absolute',
						left: cx - 340,
						top: cy - 340,
						width: 680,
						height: 680,
						borderRadius: 340,
						background: `radial-gradient(circle, rgba(255,90,31,${0.18 + 0.22 * p}) 0%, rgba(255,90,31,0.05) 45%, rgba(0,0,0,0) 70%)`,
					}}
				/>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<defs>
						<pattern id="points" width={18} height={18} patternUnits="userSpaceOnUse">
							<circle cx={9} cy={9} r={2.6} fill="rgba(255,90,31,0.22)" />
						</pattern>
						<linearGradient id="anneau" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stopColor={OR} />
							<stop offset="1" stopColor={OR2} />
						</linearGradient>
						<filter id="lueur" x="-50%" y="-50%" width="200%" height="200%">
							<feGaussianBlur stdDeviation={10} result="b" />
							<feMerge>
								<feMergeNode in="b" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>
					<circle cx={cx} cy={cy} r={R - 22} fill="#160f10" />
					<circle cx={cx} cy={cy} r={R - 22} fill="url(#points)" />
					<circle cx={cx} cy={cy} r={R} fill="none" stroke="#2a2326" strokeWidth={20} />
					<circle
						cx={cx}
						cy={cy}
						r={R}
						fill="none"
						stroke="url(#anneau)"
						strokeWidth={20}
						strokeLinecap="round"
						strokeDasharray={`${C * p} ${C}`}
						transform={`rotate(-90 ${cx} ${cy})`}
						filter="url(#lueur)"
					/>
				</svg>
				<div style={{position: 'absolute', left: 0, right: 0, top: cy - 70, textAlign: 'center', fontSize: 132, fontWeight: 800, letterSpacing: -4, lineHeight: '140px', fontVariantNumeric: 'tabular-nums'}}>
					{pct}%
				</div>
				{ETAPES.map((e, i) => {
					const debut = i / ETAPES.length;
					const finE = (i + 1) / ETAPES.length;
					const faite = p >= finE - 0.001;
					const enCours = !faite && p >= debut;
					const k = interpolate(p, [finE - 0.04, finE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
					const y = haut + 860 + i * 170;
					return (
						<div
							key={e}
							style={{
								position: 'absolute',
								left: 96,
								width: 888,
								top: y,
								height: 140,
								borderRadius: 22,
								background: faite ? '#2a1610' : '#18151a',
								borderLeft: `7px solid ${faite || enCours ? OR : '#2c2830'}`,
								boxSizing: 'border-box',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: 44,
									top: 38,
									width: 64,
									height: 64,
									borderRadius: 32,
									boxSizing: 'border-box',
									border: faite ? 'none' : '4px solid #55505a',
									background: faite ? OR : 'transparent',
									transform: `scale(${1 + 0.25 * Math.sin(Math.PI * k)})`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								{faite ? (
									<svg width={34} height={34} viewBox="0 0 24 24">
										<path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								) : null}
							</div>
							<div style={{position: 'absolute', left: 150, top: 0, lineHeight: '140px', fontSize: 46, fontWeight: 500, color: enCours ? OR : faite ? '#fff' : '#b9b5bd'}}>{e}</div>
						</div>
					);
				})}
			</div>
			{url ? <BarreSafari url={url} /> : null}
		</AbsoluteFill>
	);
};
