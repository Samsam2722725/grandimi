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
const HABITUDES_TALLER = [
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
	/** Liste d'habitudes à la place de celle de Taller (02/11 : formulations qui disent quoi faire sans tout donner). */
	habitudes?: string[];
	/** Carte verrouillée sous la liste (« +7 habitudes clés… ») : montre que le site en contient plus. */
	verrou?: {titre: string; sous: string; nombre: number};
	/** Zoom lent pendant les coches (défaut 1,05). */
	avanceZ?: number;
	urlDecale?: number;
	/** Titre de l'écran (défaut « Ma routine », ou « Routine quotidienne » avec taller). */
	titre?: string;
}> = ({at, url, flou = 13, chut, onglets, taller, coche, habitudes, verrou, urlDecale = 0, avanceZ = 1.05, titre}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const HABITUDES = habitudes ?? HABITUDES_TALLER;
	const total = verrou ? HABITUDES.length + verrou.nombre : taller ? 9 : 10;
	const pas = coche ? (coche.a - coche.de) / Math.max(1, HABITUDES.length - 1) : 0;
	const cocheA = (i: number) => (coche ? coche.de + i * pas : Infinity);
	const faites = coche ? HABITUDES.filter((_, i) => f >= cocheA(i)).length : 0;
	const flouEntree = coche ? interpolate(f, [at, at + 6], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
	const avance = coche ? interpolate(f, [at, coche.a + 20], [1, avanceZ], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
	const haut = url ? 172 + urlDecale : 0;
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
				<div style={{position: 'absolute', left: 90, top: 40, fontSize: 60, fontWeight: 800}}>{titre ?? (taller ? 'Routine quotidienne' : 'Ma routine')}</div>
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
						const k = coche ? interpolate(f, [cocheA(i), cocheA(i) + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0; // sans coche : cocheA = Infinity
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
					{verrou ? (
						<Verrou
							top={330 + HABITUDES.length * 168}
							k={interpolate(f, [coche ? coche.a + 4 : at + 8, (coche ? coche.a + 4 : at + 8) + 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
							titre={verrou.titre}
							sous={verrou.sous}
							f={f}
						/>
					) : null}
				</div>
			</div>
			{onglets ? <BarreOnglets onglets={onglets} actif={Math.max(0, onglets.indexOf('Routine'))} /> : null}
			{chut !== undefined && f >= chut ? (
				<div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontSize: 420, lineHeight: 1, opacity: s, transform: `scale(${rebond})`}}>🤫</div>
			) : null}
			{url ? <BarreSafari url={url} decale={urlDecale} /> : null}
		</AbsoluteFill>
	);
};

/** Carte « +N habitudes clés » : verrouillée, bord orange qui pulse, lignes fantômes floutées derrière. */
const Verrou: React.FC<{top: number; k: number; titre: string; sous: string; f: number}> = ({top, k, titre, sous, f}) => {
	if (k <= 0) return null;
	const rebond = 1 + 0.08 * Math.sin(Math.PI * Math.min(1, k * 1.2)) * (k < 1 ? 1 : 0);
	const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(f / 6));
	return (
		<div style={{position: 'absolute', left: 90, right: 90, top, height: 250, opacity: k, transform: `translateY(${(1 - k) * 60}px) scale(${rebond})`}}>
			{/* lignes fantômes : il y a d'autres habitudes, illisibles */}
			{[0, 1].map((j) => (
				<div key={j} style={{position: 'absolute', left: 0, right: 0, top: j * 70, height: 120, borderRadius: 26, background: '#161616', filter: 'blur(5px)', opacity: 0.6 - j * 0.2}}>
					<div style={{position: 'absolute', left: 130, top: 44, width: 420 - j * 90, height: 30, borderRadius: 15, background: '#3a3a3a'}} />
				</div>
			))}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 40,
					height: 200,
					borderRadius: 30,
					background: 'linear-gradient(135deg, rgba(255,90,31,0.22), rgba(255,90,31,0.08))',
					border: `3px solid rgba(255,90,31,${pulse})`,
					boxShadow: `0 0 ${30 * pulse}px rgba(255,90,31,${0.45 * pulse})`,
					backdropFilter: 'blur(6px)',
				}}
			>
				<svg width={70} height={80} viewBox="0 0 70 80" style={{position: 'absolute', left: 44, top: 58}}>
					<rect x={6} y={34} width={58} height={42} rx={9} fill="#ff5a1f" />
					<path d="M18 34 V24 a17 17 0 0 1 34 0 V34" fill="none" stroke="#ff5a1f" strokeWidth={8} strokeLinecap="round" />
					<circle cx={35} cy={54} r={6} fill="#000" />
				</svg>
				<div style={{position: 'absolute', left: 140, top: 46, fontSize: 50, fontWeight: 800, color: '#fff'}}>{titre}</div>
				<div style={{position: 'absolute', left: 140, top: 112, fontSize: 34, fontWeight: 600, color: '#ffb08f'}}>{sous}</div>
			</div>
		</div>
	);
};

/** « Daily routine » de Taller partie 30 recopiée à la même taille (mesurée le 05/11 sur references/taller-ref3,
 *  1080 × 1920) : titre y 80-161, jours y 226, carte Séries y 448-614, « En cours » + barre y 824-850, habitudes de
 *  160 px tous les 200 px dès y 921, x 52-1027. Statique (rien ne se coche), couleurs Grandimi. */
export const RoutineTaller30: React.FC<{at: number; url?: string; urlDecale?: number; habitudes: string[]; total: number}> = ({at, url, urlDecale = 0, habitudes, total}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const CARTE30 = '#17171a';
	return (
		<AbsoluteFill style={{background: '#000', fontFamily: FONT, color: '#fff'}}>
			<div style={{position: 'absolute', left: 56, top: 70, fontSize: 78, fontWeight: 800, letterSpacing: -1}}>Routine quotidienne</div>
			<div style={{position: 'absolute', right: 56, top: 82, width: 70, height: 70, borderRadius: 35, background: '#1d1d20'}} />
			<div style={{position: 'absolute', left: 52, right: 53, top: 226, display: 'flex', justifyContent: 'space-between'}}>
				{['3', '4', '5', '6', '7', '8', '9'].map((j, i) => (
					<div key={j} style={{width: 120, height: 150, borderRadius: 24, background: i === 3 ? OR : CARTE30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 700}}>
						{j}
						<span style={{fontSize: 28, fontWeight: 500, marginTop: 6}}>nov</span>
					</div>
				))}
			</div>
			<div style={{position: 'absolute', left: 52, right: 53, top: 448, height: 166, borderRadius: 34, background: CARTE30}}>
				<div style={{position: 'absolute', left: 70, top: 52, fontSize: 56, fontWeight: 800}}>Séries 🔥</div>
				<div style={{position: 'absolute', right: 26, top: 32, width: 260, height: 104, borderRadius: 26, background: OR, textAlign: 'center', lineHeight: '104px', fontSize: 52, fontWeight: 800}}>0</div>
			</div>
			<div style={{position: 'absolute', left: 52, top: 735, fontSize: 46, fontWeight: 600}}>En cours</div>
			<div style={{position: 'absolute', right: 53, top: 735, fontSize: 46, fontWeight: 600}}>0/{total}</div>
			<div style={{position: 'absolute', left: 52, right: 53, top: 824, height: 26, borderRadius: 13, background: '#222'}} />
			{habitudes.map((h, i) => (
				<div key={h} style={{position: 'absolute', left: 52, right: 53, top: 921 + i * 200, height: 160, borderRadius: 34, background: CARTE30}}>
					<div style={{position: 'absolute', left: 44, top: 52, width: 56, height: 56, borderRadius: 12, background: '#2a2a2e'}} />
					<div style={{position: 'absolute', left: 150, top: 52, fontSize: 50, fontWeight: 600}}>{h}</div>
				</div>
			))}
			{url ? <BarreSafari url={url} decale={urlDecale} /> : null}
		</AbsoluteFill>
	);
};
