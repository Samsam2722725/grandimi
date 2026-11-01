import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {BarreSafari} from './Dashboard';

/*
 * Écran « Création de ton plan… » du site grandimi.com (capture du 01/11) redessiné net en 1080 × 1920 : titre,
 * grand disque orange lumineux avec un bonhomme blanc, anneau fin autour, « progression » + pourcentage, barre
 * orange, puis cinq étapes : faite (fond brun, icône orange, coche ronde à droite), en cours (fond brun, icône
 * orange, cercle qui tourne), à venir (fond gris foncé, icône et texte éteints).
 */
const OR = '#ff5a1f';
const ETAPES = ['Analyse des facteurs', 'Analyse de ta génétique', 'Fenêtre de croissance', 'Construction du plan', 'Création de routine'];

const Icone: React.FC<{i: number; couleur: string}> = ({i, couleur}) => {
	const p = {fill: 'none', stroke: couleur, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
	return (
		<svg width={30} height={30} viewBox="0 0 24 24">
			{i === 0 ? (
				<g {...p}>
					<path d="M4 4 V20 H20" />
					<path d="M9 16 V11 M13 16 V8 M17 16 V12" />
				</g>
			) : i === 1 ? (
				<g {...p}>
					<path d="M5 19 C9 15 15 9 19 5" />
					<path d="M5 13 C8 13 11 16 11 19 M13 5 C13 8 16 11 19 11" />
					<path d="M8 9 L15 16" />
				</g>
			) : i === 2 ? (
				<g {...p}>
					<path d="M7 3 H17 M7 21 H17" />
					<path d="M8 3 C8 9 16 9 16 12 C16 15 8 15 8 21 M16 3 C16 9 8 9 8 12 C8 15 16 15 16 21" />
				</g>
			) : i === 3 ? (
				<g {...p}>
					<path d="M3 6 L5 8 L8 4 M3 13 L5 15 L8 11" />
					<path d="M11 6 H21 M11 13 H21 M11 19 H21" />
				</g>
			) : (
				<g {...p}>
					<path d="M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z" />
					<path d="M9 12 L11 14 L15 10" />
				</g>
			)}
		</svg>
	);
};

export const CalculGrandimi: React.FC<{at: number; fin: number; url?: string}> = ({at, fin, url}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const d = Math.max(10, fin - at - 6);
	const p = interpolate(f, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
	const pct = Math.round(100 * p);
	const entree = interpolate(f, [at, at + 7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const haut = url ? 172 : 0;
	const pulse = 1 + 0.025 * Math.sin((f - at) / 5);
	const cy = 470;
	return (
		<AbsoluteFill style={{background: '#0c0a0a', fontFamily: FONT, color: '#fff'}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: haut,
					width: 1080,
					height: 1920 - haut,
					background: `radial-gradient(circle at 50% ${cy}px, rgba(255,90,31,${0.3 + 0.12 * Math.sin((f - at) / 5)}) 0%, rgba(120,40,10,0.18) 28%, rgba(0,0,0,0) 55%)`,
					opacity: entree,
					transform: `translateY(${(1 - entree) * 50}px)`,
				}}
			>
				<div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontSize: 62, fontWeight: 700, letterSpacing: -1}}>Création de ton plan…</div>
				{/* disque orange + anneau */}
				<div style={{position: 'absolute', left: 540 - 180, top: cy - 180, width: 360, height: 360, borderRadius: 180, border: '2px solid rgba(255,110,40,0.45)', transform: `scale(${2 - pulse})`}} />
				<div
					style={{
						position: 'absolute',
						left: 540 - 150,
						top: cy - 150,
						width: 300,
						height: 300,
						borderRadius: 150,
						background: 'radial-gradient(circle at 50% 30%, #ff9a00 0%, #ff6a10 45%, #d83c00 100%)',
						boxShadow: `0 0 ${90 * pulse}px rgba(255,90,20,0.75)`,
						transform: `scale(${pulse})`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<svg width={110} height={180} viewBox="0 0 44 72">
						<ellipse cx={22} cy={7} rx={7.5} ry={6.5} fill="#fff" />
						<rect x={10} y={16} width={24} height={28} rx={6} fill="#fff" />
						<rect x={3} y={17} width={5.5} height={22} rx={2.75} fill="#fff" />
						<rect x={35.5} y={17} width={5.5} height={22} rx={2.75} fill="#fff" />
						<rect x={12} y={40} width={8.5} height={31} rx={4} fill="#fff" />
						<rect x={23.5} y={40} width={8.5} height={31} rx={4} fill="#fff" />
					</svg>
				</div>
				{/* progression */}
				<div style={{position: 'absolute', left: 150, top: 720, fontSize: 36, color: '#a8a29f'}}>progression</div>
				<div style={{position: 'absolute', right: 150, top: 714, fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums'}}>{pct}%</div>
				<div style={{position: 'absolute', left: 150, right: 150, top: 786, height: 20, borderRadius: 10, background: '#2b2726', overflow: 'hidden'}}>
					<div style={{width: `${100 * p}%`, height: '100%', borderRadius: 10, background: 'linear-gradient(90deg, #ffb300, #ff5a1f)'}} />
				</div>
				{ETAPES.map((e, i) => {
					const finE = (i + 1) / ETAPES.length;
					const faite = p >= finE - 0.001;
					const enCours = !faite && p >= i / ETAPES.length;
					const actif = faite || enCours;
					const k = interpolate(p, [finE - 0.03, finE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
					const y = 850 + i * 132;
					return (
						<div key={e} style={{position: 'absolute', left: 150, right: 150, top: y, height: 114, borderRadius: 26, background: actif ? '#2a160e' : '#181615'}}>
							<div
								style={{
									position: 'absolute',
									left: 26,
									top: 27,
									width: 60,
									height: 60,
									borderRadius: 30,
									background: actif ? OR : '#2a2726',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<Icone i={i} couleur={actif ? '#fff' : '#77716e'} />
							</div>
							<div style={{position: 'absolute', left: 118, top: 0, lineHeight: '114px', fontSize: 40, fontWeight: 700, color: actif ? '#fff' : '#5f5a58'}}>{e}</div>
							{faite ? (
								<div
									style={{
										position: 'absolute',
										right: 28,
										top: 31,
										width: 52,
										height: 52,
										borderRadius: 26,
										background: OR,
										transform: `scale(${0.6 + 0.4 * k + 0.2 * Math.sin(Math.PI * k)})`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<svg width={28} height={28} viewBox="0 0 24 24">
										<path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							) : enCours ? (
								<svg width={52} height={52} viewBox="0 0 52 52" style={{position: 'absolute', right: 28, top: 31, transform: `rotate(${(f - at) * 18}deg)`}}>
									<circle cx={26} cy={26} r={21} fill="none" stroke="rgba(255,90,31,0.25)" strokeWidth={5} />
									<path d="M26 5 A21 21 0 0 1 47 26" fill="none" stroke={OR} strokeWidth={5} strokeLinecap="round" />
								</svg>
							) : null}
						</div>
					);
				})}
			</div>
			{url ? <BarreSafari url={url} /> : null}
		</AbsoluteFill>
	);
};
