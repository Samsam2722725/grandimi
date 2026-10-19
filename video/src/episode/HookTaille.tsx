import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {ease} from '../anim';
import {FONT} from '../theme';

/*
 * Accroche dessinée « 1m78, c'est la taille moyenne en France » (modèle : vidéo de l'utilisateur a56d6d55).
 * Plan 1 : bonhomme à côté d'une barre bleue qui monte jusqu'à la taille, chiffre qui compte puis se pose
 * (coup de caméra, éclats, le bonhomme lève les yeux et s'étonne). Plan 2 (à `carte`, enchaîné en zoom
 * traversant) : la carte de France tombe, la règle se dessine, le petit bonhomme arrive en marchant ; à
 * `moyenne` la silhouette grandit jusqu'au repère rouge et l'étiquette de la taille apparaît ; à `france`
 * la carte bat une fois ; à `question` un « ? » surgit au-dessus du petit bonhomme.
 * Règles de rythme : rien d'immobile plus de ~0,3 s, chaque mot-clé déclenche un événement, mouvements en
 * anticipation / dépassement / retour. Positions mesurées sur le modèle (1080×1920).
 */

const BLEU = '#1593ee';
const BLEU_CLAIR = '#5ab8ff';
const ORANGE = '#ff7a00';
const ENCRE = '#151515';
const ROUGE = '#e8202a';
const FPS = 30;

const ressort = (f: number, at: number, damping = 13, stiffness = 170, mass = 0.7) =>
	f < at ? 0 : spring({frame: f - at, fps: FPS, config: {damping, stiffness, mass}});

/** Bosse 0 → 1 → 0 sur `dur` frames à partir de `at` (coups, pulsations). */
const bosse = (f: number, at: number, dur: number) => (f < at || f > at + dur ? 0 : Math.sin(((f - at) / dur) * Math.PI));

/** Petite secousse amortie après `at`. */
const secousse = (f: number, at: number, amp: number) => (f < at || f > at + 8 ? 0 : amp * Math.sin((f - at) * 2.6) * (1 - (f - at) / 8));

const Fond: React.FC = () => (
	<AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 48%, #ffffff 0%, #f7f7f7 45%, #c9c9c9 100%)'}} />
);

/** Bonhomme dessiné. `bras` : 0 = le long du corps, 1 = main sur la barre ; `regard` : 0 = devant, 1 = vers le haut ;
 *  `surpris` (0 → 1) : sourcils levés, bouche en « o ». */
const Bonhomme: React.FC<{
	x: number;
	sol: number;
	h: number;
	f: number;
	bras: number;
	mainY: number;
	regard: number;
	surpris: number;
	ecrase: number;
}> = ({x, sol, h, f, bras, mainY, regard, surpris, ecrase}) => {
	const u = h / 900;
	const souffle = Math.sin(f / 8) * 5 * u;
	const t = sol - h + souffle;
	const head = 118 * u;
	const cy = t + head;
	const neck = cy + head;
	const hip = neck + 330 * u - souffle * 0.5;
	const sw = 9 * u;
	const blink = f % 45 >= 41 && f % 45 < 44 ? 0.15 : 1;
	const shoulder = {x: x + 70 * u, y: neck + 45 * u};
	const handDown = {x: x + 105 * u, y: hip + 30 * u};
	const handUp = {x: x + 172 * u, y: Math.max(neck - 10 * u, mainY)};
	const hand = {x: handDown.x + (handUp.x - handDown.x) * bras, y: handDown.y + (handUp.y - handDown.y) * bras};
	const elbow = {x: (shoulder.x + hand.x) / 2 + 40 * u * (1 - bras) + 25 * u * bras, y: (shoulder.y + hand.y) / 2 + 70 * u * bras};
	const tilt = Math.sin(f / 21) * 2 + 4 * bras - 6 * regard;
	const py = -14 * u * regard; // pupilles vers le haut
	const px = 6 * u * regard;
	const sourcil = -18 * u * surpris;
	return (
		<g
			strokeLinecap="round"
			strokeLinejoin="round"
			stroke={ENCRE}
			strokeWidth={sw}
			transform={`translate(${x} ${sol}) scale(${1 + 0.06 * ecrase} ${1 - 0.06 * ecrase}) translate(${-x} ${-sol})`}
		>
			<ellipse cx={x} cy={sol + 6 * u} rx={130 * u} ry={14 * u} fill="#000" opacity={0.09} stroke="none" />
			<path d={`M${x - 45 * u},${hip + 60 * u} L${x - 50 * u},${sol - 8 * u} L${x - 95 * u},${sol - 8 * u}`} fill="none" />
			<path d={`M${x + 40 * u},${hip + 60 * u} L${x + 45 * u},${sol - 8 * u} L${x + 90 * u},${sol - 8 * u}`} fill="none" />
			<path
				d={`M${x - 80 * u},${hip - 20 * u} L${x + 75 * u},${hip - 20 * u} L${x + 82 * u},${hip + 140 * u} L${x + 8 * u},${hip + 140 * u} L${x},${hip + 62 * u} L${x - 12 * u},${hip + 140 * u} L${x - 87 * u},${hip + 140 * u} Z`}
				fill="#8d8d8d"
			/>
			<path d={`M${x - 70 * u},${hip + 10 * u} L${x - 75 * u},${hip + 120 * u}`} stroke="#a9a9a9" strokeWidth={10 * u} />
			<path
				d={`M${x - 70 * u},${neck + 22 * u} Q${x},${neck + 8 * u} ${x + 70 * u},${neck + 22 * u} L${x + 78 * u},${hip} L${x - 82 * u},${hip} Z`}
				fill="#fff"
			/>
			<path d={`M${x - 20 * u},${neck + 14 * u} Q${x},${neck + 40 * u} ${x + 20 * u},${neck + 14 * u}`} fill="none" strokeWidth={sw * 0.6} />
			<path d={`M${x - 72 * u},${neck + 40 * u} Q${x - 95 * u},${neck + 180 * u} ${x - 92 * u},${hip + 40 * u}`} fill="none" />
			<path d={`M${shoulder.x},${shoulder.y} Q${elbow.x},${elbow.y} ${hand.x},${hand.y}`} fill="none" />
			<ellipse cx={hand.x + 4 * u} cy={hand.y - 4 * u} rx={14 * u} ry={24 * u} fill={ENCRE} stroke="none" />
			<g transform={`rotate(${tilt} ${x} ${neck})`}>
				<circle cx={x} cy={cy} r={head} fill="#fff" strokeWidth={sw * 1.15} />
				<ellipse cx={x - 28 * u + px} cy={cy - 6 * u + py} rx={7 * u} ry={11 * u * blink * (1 + 0.25 * surpris)} fill={ENCRE} stroke="none" />
				<ellipse cx={x + 45 * u + px} cy={cy - 6 * u + py} rx={7 * u} ry={11 * u * blink * (1 + 0.25 * surpris)} fill={ENCRE} stroke="none" />
				<path d={`M${x - 52 * u},${cy - 32 * u + sourcil} L${x - 14 * u},${cy - 30 * u + sourcil}`} strokeWidth={sw * 0.6} />
				<path d={`M${x + 28 * u},${cy - 30 * u + sourcil} L${x + 62 * u},${cy - 32 * u + sourcil}`} strokeWidth={sw * 0.6} opacity={surpris} />
				{surpris > 0.5 ? (
					<ellipse cx={x + 16 * u} cy={cy + 46 * u} rx={13 * u} ry={17 * u * surpris} fill={ENCRE} stroke="none" />
				) : (
					<path d={`M${x - 2 * u},${cy + 40 * u} Q${x + 18 * u},${cy + 55 * u} ${x + 40 * u},${cy + 36 * u}`} fill="none" strokeWidth={sw * 0.7} />
				)}
			</g>
		</g>
	);
};

/** Petit bonhomme noir sur un disque bleu. `marche` > 0 : jambes et bras en mouvement ; `leve` : tête levée. */
const Mini: React.FC<{x: number; sol: number; h: number; f: number; marche: number; leve: number}> = ({x, sol, h, f, marche, leve}) => {
	const u = h / 200;
	const pas = Math.sin(f / 2.2) * marche;
	const saut = marche > 0.05 ? -Math.abs(Math.sin(f / 2.2)) * 8 * marche : -Math.abs(Math.sin(f / 7)) * 5;
	const s = sol + saut;
	const hx = x + 6 * u - 4 * u * leve;
	const hy = s - 178 * u - 6 * u * leve;
	return (
		<g stroke={ENCRE} strokeWidth={9 * u} strokeLinecap="round" fill="none">
			<ellipse cx={x} cy={sol + 4} rx={70 * u * (1 + saut / 80)} ry={11 * u} fill={BLEU} stroke="none" />
			<circle cx={hx} cy={hy} r={22 * u} fill={ENCRE} stroke="none" />
			<path d={`M${x + 2 * u},${s - 154 * u} L${x - 2 * u},${s - 80 * u}`} />
			<path d={`M${x - 2 * u},${s - 80 * u} L${x - 12 * u + 26 * u * pas},${s}`} />
			<path d={`M${x - 2 * u},${s - 80 * u} L${x + 10 * u - 26 * u * pas},${s}`} />
			<path d={`M${x + 2 * u},${s - 140 * u} L${x - 12 * u - 18 * u * pas},${s - 95 * u}`} />
		</g>
	);
};

/** Règle verticale (graduations à gauche) ; `trace` (0 → 1) la dessine de bas en haut. */
const Regle: React.FC<{x: number; y0: number; y1: number; trace: number}> = ({x, y0, y1, trace}) => {
	const top = y1 - (y1 - y0) * trace;
	const ticks = [];
	for (let y = y1 - 12, i = 0; y > top + 6; y -= 16, i++) ticks.push(<line key={i} x1={x - (i % 5 === 0 ? 34 : 20)} x2={x} y1={y} y2={y} />);
	return (
		<g stroke={ENCRE} strokeWidth={4}>
			<rect x={x - 46} y={top} width={56} height={y1 - top} fill="#fff" stroke="none" opacity={0.92} />
			<line x1={x} x2={x} y1={top} y2={y1} strokeWidth={6} />
			{ticks}
		</g>
	);
};

/** Silhouette pleine translucide, tête en cercle tireté qui tourne. */
const Fantome: React.FC<{x: number; sol: number; h: number; f: number}> = ({x, sol, h, f}) => {
	if (h < 4) return null;
	const u = h / 770;
	const r = 68 * u;
	const t = sol - h;
	const n = t + 2 * r + 6 * u;
	const body = `M${x - 18 * u},${n} L${x - 70 * u},${n + 30 * u} L${x - 110 * u},${n + 300 * u} L${x - 84 * u},${n + 306 * u} L${x - 52 * u},${n + 110 * u}
		L${x - 50 * u},${n + 300 * u} L${x - 60 * u},${sol} L${x - 14 * u},${sol} L${x},${n + 340 * u} L${x + 14 * u},${sol} L${x + 60 * u},${sol}
		L${x + 50 * u},${n + 300 * u} L${x + 52 * u},${n + 110 * u} L${x + 84 * u},${n + 306 * u} L${x + 110 * u},${n + 300 * u} L${x + 70 * u},${n + 30 * u} L${x + 18 * u},${n} Z`;
	return (
		<g>
			<path d={body} fill={BLEU_CLAIR} fillOpacity={0.2} stroke="#5f8aa6" strokeWidth={7 * u} strokeLinejoin="round" />
			<circle
				cx={x}
				cy={t + r}
				r={r}
				fill={BLEU_CLAIR}
				fillOpacity={0.15}
				stroke={BLEU}
				strokeWidth={8 * u}
				strokeDasharray={`${16 * u} ${11 * u}`}
				strokeDashoffset={-f * 1.8}
			/>
		</g>
	);
};

/** Éclats qui partent d'un point (pose du chiffre). */
const Eclats: React.FC<{cx: number; cy: number; f: number; at: number}> = ({cx, cy, f, at}) => {
	const t = (f - at) / 14;
	if (t < 0 || t > 1) return null;
	const d = Easing.out(Easing.cubic)(t);
	return (
		<g>
			{Array.from({length: 14}, (_, i) => {
				const a = (i / 14) * Math.PI * 2 + 0.3;
				const r = 120 + 260 * d * (i % 2 ? 0.75 : 1);
				return (
					<circle
						key={i}
						cx={cx + Math.cos(a) * r * 1.25}
						cy={cy + Math.sin(a) * r * 0.75}
						r={(i % 3 === 0 ? 14 : 9) * (1 - t)}
						fill={i % 2 ? BLEU : BLEU_CLAIR}
						opacity={1 - t}
					/>
				);
			})}
		</g>
	);
};

export const HookTaille: React.FC<{cm: number; carte: number; moyenne: number; france?: number; question?: number}> = ({
	cm,
	carte,
	moyenne,
	france,
	question,
}) => {
	const f = useCurrentFrame();
	const [map, setMap] = useState<{w: number; h: number; d: string} | null>(null);
	const [handle] = useState(() => delayRender('carte de France'));
	useEffect(() => {
		fetch(staticFile('dessins/france.json'))
			.then((r) => r.json())
			.then((j) => {
				setMap(j);
				continueRender(handle);
			});
	}, [handle]);

	if (f < carte) {
		/* ── Plan 1 : la barre ── */
		const SOL = 1488;
		const TOP = 529;
		const zin = interpolate(f, [0, 7], [1.6, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		const flouIn = interpolate(f, [0, 6], [20, 0], {extrapolateRight: 'clamp'});
		const zout = interpolate(f, [carte - 4, carte], [1, 1.45], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
		const flouOut = interpolate(f, [carte - 4, carte], [0, 16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const grow = ressort(f, 3, 12, 95);
		const g1 = Math.min(1, grow);
		const pose = Math.min(carte - 6, 16); // frame où le chiffre se pose (barre arrivée)
		const barTop = SOL - (SOL - TOP) * grow;
		const shown = Math.round(100 + (cm - 100) * (f >= pose ? 1 : Math.min(0.995, g1)));
		const num = ressort(f, 4, 11, 210);
		const punch = bosse(f, pose, 7);
		const cam = 1 + Math.max(0, f - 7) * 0.0022 + 0.05 * punch; // poussée continue + coup sur la pose
		const suiviY = 50 * g1; // la caméra monte avec la barre
		const shakeX = secousse(f, pose, 9);
		const entree = ressort(f, 0, 10, 220);
		const ecrase = bosse(f, 0, 8) * 0.8 + bosse(f, pose, 6) * 0.6;
		const bras = ease(f, 2, 12);
		const regard = ease(f, 6, 10);
		const surpris = f >= pose ? (bosse(f, pose, 16) > 0.2 ? 1 : 0) : 0;
		// Traînée de vitesse au sommet de la barre pendant la montée.
		const vitesse = Math.max(0, Math.min(1, (ressort(f, 3, 12, 95) - ressort(f - 1, 3, 12, 95)) * 8));
		const ticks = [];
		for (let y = SOL - 30, i = 0; y > barTop + 10; y -= 48, i++)
			ticks.push(<line key={i} x1={648 - (i % 2 ? 22 : 38)} x2={648} y1={y} y2={y} stroke="#fff" strokeWidth={5} opacity={0.85} />);
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill
					style={{
						transformOrigin: '50% 38%',
						transform: `translate(${shakeX}px, ${suiviY}px) scale(${zin * cam * zout})`,
						filter: flouIn + flouOut > 0.3 ? `blur(${flouIn + flouOut}px)` : undefined,
					}}
				>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<line x1={216} x2={907} y1={SOL} y2={SOL} stroke="#555" strokeWidth={5} />
						<rect x={464} y={barTop} width={184} height={Math.max(0, SOL - barTop)} fill={BLEU} rx={4} />
						<rect x={464} y={barTop} width={184} height={Math.max(0, 220 * vitesse)} fill="url(#trainee)" />
						<rect x={476} y={barTop + 8} width={26} height={Math.max(0, SOL - barTop - 16)} fill="#fff" opacity={0.18} rx={6} />
						<defs>
							<linearGradient id="trainee" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stopColor="#fff" stopOpacity={0.55} />
								<stop offset="1" stopColor="#fff" stopOpacity={0} />
							</linearGradient>
						</defs>
						{ticks}
						<g transform={`translate(300 ${SOL}) scale(${0.85 + 0.15 * entree}) translate(-300 ${-SOL})`}>
							<Bonhomme x={300} sol={SOL - 2} h={900} f={f} bras={bras} mainY={barTop + 40} regard={regard} surpris={surpris} ecrase={ecrase} />
						</g>
						<Eclats cx={556} cy={395} f={f} at={pose} />
					</svg>
					<div
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 250,
							textAlign: 'center',
							fontFamily: "'Poppins', " + FONT,
							fontWeight: 800,
							fontSize: 290,
							lineHeight: 1,
							color: BLEU,
							letterSpacing: -10,
							fontVariantNumeric: 'tabular-nums',
							transform: `scale(${(0.5 + 0.5 * num) * (1 + 0.2 * punch)}, ${(0.5 + 0.5 * num) * (1 + 0.2 * punch - 0.08 * bosse(f, pose + 3, 5))})`,
							opacity: Math.min(1, num * 1.5),
						}}
					>
						{shown}
						<span style={{fontSize: 52, fontWeight: 700, color: '#666', letterSpacing: 0, marginLeft: 10, opacity: ease(f, pose, 5)}}>cm</span>
					</div>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── Plan 2 : la carte ── */
	const g = f - carte;
	const RX = 506;
	const SOL = 1290;
	// Suite du zoom traversant : on arrive « de près » et on se pose, dans le même sens que la sortie du plan 1.
	const zin = interpolate(g, [0, 6], [1.3, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const flou = interpolate(g, [0, 5], [14, 0], {extrapolateRight: 'clamp'});
	const pousse = 1 + g * 0.0012 + (france !== undefined ? 0.035 * ease(f, france + 8, 30) : 0);
	const chute = ressort(g, 1, 10, 180);
	const mapY = (1 - chute) * -320;
	const impact = bosse(g, 7, 6);
	const pulse = france !== undefined ? bosse(f, france, 9) : 0;
	const trace = ease(g, 3, 10);
	const arrivee = ease(g, 2, 15);
	const miniX = -140 + (226 + 140) * arrivee;
	const marche = 1 - ease(g, 12, 5);
	const ghost = ressort(f, moyenne, 11, 120);
	const regleTop = interpolate(Math.min(1, ghost), [0, 1], [529, 313]);
	const flag = ressort(f, moyenne + 9, 10, 220);
	const leve = question !== undefined ? ease(f, question - 2, 6) : 0;
	const qm = question !== undefined ? ressort(f, question, 9, 240) : 0;
	const mapScale = 713 / (map?.w ?? 800);
	const mapW = map?.w ?? 800;
	const mapH = map?.h ?? 788;
	return (
		<AbsoluteFill>
			<Fond />
			<AbsoluteFill
				style={{
					transformOrigin: '50% 45%',
					transform: `translateY(${secousse(g, 7, 5)}px) scale(${zin * pousse})`,
					filter: flou > 0.3 ? `blur(${flou}px)` : undefined,
				}}
			>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					{map ? (
						<g
							transform={`translate(281 ${576 + mapY}) scale(${mapScale}) translate(${mapW / 2} ${mapH}) scale(${1 + 0.05 * impact + 0.05 * pulse} ${1 - 0.06 * impact + 0.05 * pulse}) translate(${-mapW / 2} ${-mapH})`}
						>
							<path d={map.d} fill="#000" opacity={0.08} transform="translate(8 14)" />
							<path d={map.d} fill={ORANGE} />
							{pulse > 0 ? <path d={map.d} fill="none" stroke="#ffb066" strokeWidth={14 / mapScale} opacity={pulse} /> : null}
						</g>
					) : null}
					<Regle x={RX} y0={regleTop} y1={SOL} trace={trace} />
					<Fantome x={640} sol={SOL - 20} h={(SOL - 20 - regleTop) * 0.8 * ghost} f={f} />
					{ghost > 0.01 ? (
						<g>
							<rect x={RX - 46} y={regleTop - 14} width={56} height={22} fill={ROUGE} />
							<line x1={RX} x2={RX + 160 * Math.min(1, ghost)} y1={regleTop - 3} y2={regleTop - 3} stroke={ROUGE} strokeWidth={8} />
						</g>
					) : null}
					{flag > 0.01 ? (
						<g transform={`translate(${RX + 270} ${regleTop - 4}) scale(${1.45 * flag})`}>
							<rect x={-78} y={-38} width={156} height={70} rx={20} fill={BLEU} />
							<text x={0} y={12} textAnchor="middle" fill="#fff" fontSize={42} fontWeight={800} fontFamily={"'Poppins', " + FONT}>
								{cm} cm
							</text>
						</g>
					) : null}
					<Mini x={miniX} sol={SOL} h={200} f={f} marche={marche} leve={leve} />
					{qm > 0.01 ? (
						<text
							x={226}
							y={1040}
							textAnchor="middle"
							fontSize={190}
							fontWeight={800}
							fontFamily={"'Poppins', " + FONT}
							fill={ROUGE}
							stroke="#fff"
							strokeWidth={8}
							paintOrder="stroke"
							transform={`rotate(${Math.sin(f / 5) * 8} 226 1000) translate(226 1000) scale(${qm}) translate(-226 -1000)`}
						>
							?
						</text>
					) : null}
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
