import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {BarreOnglets, BarreSafari} from './Dashboard';

/*
 * Écran « Ma routine » recopié de l'écran « Daily routine » de la référence p22-ref (14-16,6 s) : bandeau des jours,
 * « Séries 🔥 », « En cours 0/10 », liste d'habitudes à cocher, barre du bas. La liste peut être floutée avec un 🤫
 * par-dessus (`flou`, `chut`) ; depuis le 31/10 elle est nette, avec les onglets du site en bas (`onglets`).
 * Habitudes : celles de Taller, traduites (demande de l'utilisateur du 31/10 : « dit la même chose que lui »).
 */
const OR = '#ff5a1f';
const CARTE = '#161616';
const JOURS = ['7', '8', '9', '10', '11', '12', '13'];
const JOURS_TALLER = ['3', '4', '5', '6', '7', '8', '9'];
const HABITUDES = [
	'Routine physique Grandimi 🏋️',
	'1 verre de lait + miel 🍯🥛',
	'4 g de poudre de moringa 🌿',
	'13 mg de zinc 💊',
	'Dormir +8 heures 😴',
	'Oméga 3 💊',
	'15 min de soleil ☀️',
];

/** taller : titre « Routine quotidienne », jours 3-9 nov, « 0/9 » comme l'écran de Taller (nouveau style, louis-23) ;
 *  sans : « Ma routine », 7-13 févr, « 0/10 » (style des parties 19 à 22). */
/** coche : les habitudes se cochent une à une entre `de` et `a` (images locales), « En cours » compte, la barre se
 *  remplit ; à l'entrée l'écran passe du flou au net en 6 images et avance lentement (comme Taller, sans 🤫). */
export const RoutineGrandimi: React.FC<{
	at: number;
	url?: string;
	flou?: number;
	chut?: number;
	onglets?: string[];
	taller?: boolean;
	coche?: {de: number; a: number};
}> = ({at, url, flou = 13, chut, onglets, taller, coche}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const total = taller ? 9 : 10;
	const pas = coche ? (coche.a - coche.de) / Math.max(1, HABITUDES.length - 1) : 0;
	const cocheA = (i: number) => (coche ? coche.de + i * pas : Infinity);
	const faites = coche ? HABITUDES.filter((_, i) => f >= cocheA(i)).length : 0;
	const flouEntree = coche ? interpolate(f, [at, at + 6], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
	const avance = coche ? interpolate(f, [at, coche.a + 20], [1, 1.05], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
	const haut = url ? 172 : 0;
	const s = chut !== undefined ? interpolate(f, [chut, chut + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
	const rebond = chut !== undefined && f >= chut ? 1 + 0.18 * Math.max(0, 1 - (f - chut) / 6) * Math.sin(((f - chut) / 6) * Math.PI) : 1;
	return (
		<AbsoluteFill style={{background: '#000', fontFamily: FONT, color: '#fff'}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: haut,
					width: 1080,
					height: 1920 - haut,
					filter: flouEntree ? `blur(${flouEntree}px)` : undefined,
					transform: `scale(${avance})`,
					transformOrigin: '50% 40%',
				}}
			>
				<div style={{position: 'absolute', left: 90, top: 40, fontSize: 60, fontWeight: 800}}>{taller ? 'Routine quotidienne' : 'Ma routine'}</div>
				<div style={{position: 'absolute', right: 90, top: 46, width: 64, height: 64, borderRadius: 32, background: '#1d1d1d'}} />
				<div style={{position: 'absolute', left: 90, right: 90, top: 150, display: 'flex', justifyContent: 'space-between'}}>
					{(taller ? JOURS_TALLER : JOURS).map((j, i) => (
						<div
							key={j}
							style={{
								width: 104,
								height: 120,
								borderRadius: 18,
								background: i === 3 ? OR : CARTE,
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 34,
								fontWeight: 700,
							}}
						>
							{j}
							<span style={{fontSize: 22, fontWeight: 500, marginTop: 4}}>{taller ? 'nov' : 'févr'}</span>
						</div>
					))}
				</div>
				{/* Contenu de la routine (flouté si `flou`). */}
				<div style={{position: 'absolute', left: 0, top: 300, width: 1080, height: 1500, filter: flou ? `blur(${flou}px)` : undefined}}>
					<div style={{position: 'absolute', left: 90, right: 90, top: 0, height: 120, borderRadius: 26, background: CARTE}}>
						<div style={{position: 'absolute', left: 50, top: 32, fontSize: 46, fontWeight: 800}}>Séries 🔥</div>
						<div style={{position: 'absolute', right: 20, top: 18, width: 200, height: 84, borderRadius: 22, background: OR, textAlign: 'center', lineHeight: '84px', fontSize: 42, fontWeight: 800}}>0</div>
					</div>
					<div style={{position: 'absolute', left: 90, top: 190, fontSize: 38, fontWeight: 600}}>En cours</div>
					<div style={{position: 'absolute', right: 90, top: 190, fontSize: 38, fontWeight: 600}}>
						{faites}/{total}
					</div>
					<div style={{position: 'absolute', left: 90, right: 90, top: 262, height: 14, borderRadius: 7, background: '#222', overflow: 'hidden'}}>
						<div style={{width: `${(100 * faites) / total}%`, height: '100%', background: OR, borderRadius: 7}} />
					</div>
					{HABITUDES.map((h, i) => {
						const k = interpolate(f, [cocheA(i), cocheA(i) + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
						const rebond = 1 + 0.25 * Math.sin(Math.PI * k) * (k < 1 ? 1 : 0);
						return (
							<div key={h} style={{position: 'absolute', left: 90, right: 90, top: 330 + i * 168, height: 138, borderRadius: 26, background: CARTE}}>
								<div
									style={{
										position: 'absolute',
										left: 40,
										top: 46,
										width: 46,
										height: 46,
										borderRadius: 10,
										background: k > 0 ? OR : '#2a2a2a',
										opacity: k > 0 ? 0.4 + 0.6 * k : 1,
										transform: `scale(${rebond})`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: '#fff',
										fontSize: 34,
										fontWeight: 900,
									}}
								>
									{k > 0.3 ? '✓' : null}
								</div>
								<div style={{position: 'absolute', left: 130, top: 40, fontSize: 42, fontWeight: 600, opacity: 1 - 0.45 * k}}>{h}</div>
							</div>
						);
					})}
				</div>
			</div>
			{onglets ? <BarreOnglets onglets={onglets} actif={Math.max(0, onglets.indexOf('Routine'))} /> : null}
			{chut !== undefined && f >= chut ? (
				<div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontSize: 420, lineHeight: 1, opacity: s, transform: `scale(${rebond})`}}>🤫</div>
			) : null}
			{url ? <BarreSafari url={url} /> : null}
		</AbsoluteFill>
	);
};
