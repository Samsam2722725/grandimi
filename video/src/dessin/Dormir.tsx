import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, cancelRender, continueRender, delayRender, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {
	Cadenas, Coche, Croix, CYAN, Defs, ENCRE, Etiquette, FlecheHaut, Fond, GRIS, Membres, mix, O, ORANGE, poseCote, poseDebout, poseDos, ROUGE, Seg, Tete, Toise,
	VERT, VertebreFace, VertebreProfil, Disque,
} from './dessin';

/*
 * « Si tu dors sur le dos… » : dessin animé + sous-titres karaoké, recopié plan par plan de la
 * référence 7583024024171646230 (references/…/fiche.md) avec des images redessinées.
 * Données : public/dessins/dormir/ (voix, mots.json, dessin.json). Chaque plan s'accroche à un mot.
 */

const FPS = 30;
const W = 1080;
const H = 1920;
const DIR = 'dessins/dormir';

type Mot = {w: string; t: number};
export type DormirProps = {mots?: Mot[]; groupes?: string[]; totalFrames?: number};

export const calculateDormirMetadata: CalculateMetadataFunction<DormirProps> = async ({props}) => {
	const m = await fetch(staticFile(`${DIR}/mots.json`)).then((r) => r.json());
	const d = await fetch(staticFile(`${DIR}/dessin.json`)).then((r) => r.json());
	return {durationInFrames: Math.round(m.duree * FPS), fps: FPS, props: {...props, mots: m.mots, groupes: d.groupes, totalFrames: Math.round(m.duree * FPS)}};
};

const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

/** Frame du n-ième mot entendu égal à w. */
const ancre = (mots: Mot[], w: string, n = 1) => {
	let k = 0;
	for (const m of mots) if (norm(m.w) === norm(w) && ++k === n) return Math.round(m.t * FPS);
	throw new Error(`Mot introuvable : ${w} #${n}`);
};

const usePolices = () => {
	const [handle] = useState(() => delayRender('Polices'));
	useEffect(() => {
		const fonts = [
			new FontFace('Bebas Neue', `url(${staticFile('fonts/bebas-neue-latin-400-normal.woff2')})`),
			new FontFace('Poppins', `url(${staticFile('fonts/poppins-latin-800-normal.woff2')})`, {weight: '800'}),
		];
		Promise.all(fonts.map((f) => f.load()))
			.then((l) => {
				l.forEach((f) => document.fonts.add(f));
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const sortie = Easing.out(Easing.cubic);
const ressort = (f: number, raide = 220, amorti = 14) => spring({frame: f, fps: FPS, config: {damping: amorti, stiffness: raide, mass: 0.6}});

/** Caméra : clés [frame, centre x, centre y, échelle], interpolées en douceur. */
type Cle = [number, number, number, number];
const Camera: React.FC<{f: number; cles: Cle[]; children: React.ReactNode; secousse?: number}> = ({f, cles, children, secousse = 0}) => {
	const fr = cles.map((c) => c[0]);
	const val = (i: number) => (fr.length === 1 ? cles[0][i] : interpolate(f, fr, cles.map((c) => c[i]), {...clamp, easing: io}));
	const s = val(3);
	const sx = secousse * Math.sin(f * 2.7) * 14;
	const sy = secousse * Math.cos(f * 3.1) * 10;
	return <g transform={`translate(${W / 2 - val(1) * s + sx} ${H / 2 - val(2) * s + sy}) scale(${s})`}>{children}</g>;
};

const Plan: React.FC<{children: React.ReactNode; fond?: string}> = ({children, fond}) => (
	<AbsoluteFill>
		<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
			<Defs />
			<Fond couleur={fond} />
			{children}
		</svg>
	</AbsoluteFill>
);

const Ombre: React.FC<{x: number; y: number; rx: number; ry?: number}> = ({x, y, rx, ry = 22}) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#000" opacity={0.13} />;

const Oreiller: React.FC<{x: number; y: number; rx?: number; ry?: number}> = ({x, y, rx = 120, ry = 40}) => (
	<g>
		<ellipse cx={x} cy={y} rx={rx + O} ry={ry + O} fill={ENCRE} />
		<ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" />
		<ellipse cx={x - rx * 0.2} cy={y - ry * 0.35} rx={rx * 0.5} ry={ry * 0.25} fill="#eef3f7" />
	</g>
);

/** Bonhomme : membres + tête, avec un remplissage vert qui monte des pieds (rempli 0 → 1). */
const Bonhomme: React.FC<{
	pose: {segs: Seg[]; tete: {x: number; y: number; r: number}};
	humeur: Parameters<typeof Tete>[0]['humeur'];
	rotTete?: number;
	rempli?: number;
	remplisCouleur?: string;
	de?: [number, number];
	radio?: number;
}> = ({pose, humeur, rotTete = 0, rempli = 0, remplisCouleur = VERT, de, radio = 0}) => {
	const id = `clip-${Math.round((de?.[0] ?? 0) * 7 + (de?.[1] ?? 0))}`;
	const x0 = de?.[0] ?? 0;
	const x1 = de?.[1] ?? 0;
	return (
		<g>
			<Membres segs={pose.segs} />
			{radio > 0 ? <Radio segs={pose.segs} opacite={radio} /> : null}
			{rempli > 0 ? (
				<>
					<clipPath id={id}>
						<rect x={x0 - 40} y={-4000} width={(x1 - x0 + 80) * rempli} height={9000} />
					</clipPath>
					<g clipPath={`url(#${id})`} filter="url(#halo-vert)" opacity={0.92}>
						{pose.segs.map((s, i) => (
							<line key={i} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={remplisCouleur} strokeWidth={s.w * 0.72} strokeLinecap="round" opacity={0.85} />
						))}
					</g>
				</>
			) : null}
			<Tete {...pose.tete} humeur={humeur} rot={rotTete} />
		</g>
	);
};

/** Radiographie : colonne et côtes blanches dans le tronc (segment blanc le plus large). */
const Radio: React.FC<{segs: Seg[]; opacite: number}> = ({segs, opacite}) => {
	const t = segs.reduce((a, b) => (b.c === '#fff' && b.w > a.w ? b : a));
	const n = 9;
	const els = [];
	for (let i = 0; i <= n; i++) {
		const k = i / n;
		const x = t.a[0] + (t.b[0] - t.a[0]) * k;
		const y = t.a[1] + (t.b[1] - t.a[1]) * k;
		els.push(<ellipse key={i} cx={x} cy={y} rx={9} ry={t.w * 0.42} fill="none" stroke="#fff" strokeWidth={7} />);
	}
	return (
		<g opacity={opacite}>
			<line x1={t.a[0]} y1={t.a[1]} x2={t.b[0]} y2={t.b[1]} stroke="#2c8fd6" strokeWidth={t.w} strokeLinecap="round" />
			{els}
			<line x1={t.a[0]} y1={t.a[1] + t.w * 0.18} x2={t.b[0]} y2={t.b[1] + t.w * 0.18} stroke="#fff" strokeWidth={12} strokeDasharray="20 8" strokeLinecap="round" />
		</g>
	);
};

/* =================== Plans =================== */

/** 1. Sur le dos : toise rouge 1,70 m + cadenas ; le bonhomme entre par la gauche. */
const PlanDos: React.FC<{f: number; d: number; stress: number}> = ({f, d, stress}) => {
	const g = 1330;
	const k = ressort(f, 170, 16);
	const dx = -1000 * (1 - k);
	const bouge = Math.abs(dx) > 30;
	const st = f >= stress;
	const choc = st ? ressort(f - stress, 300, 9) : 0;
	const tremble = st ? Math.sin((f - stress) * 2.4) * 9 * Math.max(0, 1 - (f - stress) / 14) : 0;
	return (
		<Plan>
			<Camera
				f={f}
				cles={[
					[0, 470, 960, 1.55],
					[9, 540, 975, 1.0],
					[d, 330, 930, 1.48],
				]}
			>
				<Toise x={110} haut={600} bas={1350} />
				<Ombre x={640} y={g + 6} rx={430} />
				<g transform={`translate(${dx} 0)`} filter={bouge ? 'url(#flou-x)' : undefined}>
					<Bonhomme pose={poseDos(250, 1010, g)} humeur={st ? 'stress' : 'sourire'} rotTete={-90 + tremble} />
				</g>
				{st ? (
					<g opacity={choc} stroke={ROUGE} strokeWidth={10} strokeLinecap="round">
						<path d="M 975 1150 l 22 -40 M 1010 1168 l 40 -30 M 940 1146 l 4 -46" />
					</g>
				) : null}
				<Etiquette x={165} y={800} texte="1,70 m" couleur={ROUGE} taille={46} filter={st ? 'url(#halo-rouge)' : undefined} />
				<Cadenas x={258} y={752} s={0.62 * (1 + 0.35 * (1 - choc) * (st ? 1 : 0))} filter="url(#halo-rouge)" />
			</Camera>
		</Plan>
	);
};

/** 2. Sur le côté : la toise verte grimpe (1,85 → 2,90 m), radio du corps, flèche verte. */
const PlanCote: React.FC<{f: number; d: number; filer: number; methode: number; gris?: boolean}> = ({f, d, filer, methode, gris}) => {
	const g = 1330;
	const fx = 170;
	const hx = 1010;
	if (gris) {
		// 6. Rappel : étiquette grise, le vert commence à monter.
		const r = interpolate(f, [2, d], [0, 0.35], clamp);
		return (
			<Plan>
				<Camera f={f} cles={[[0, 540, 960, 1.0], [d, 520, 960, 1.04]]}>
					<Toise x={90} haut={560} bas={1350} />
					<Ombre x={600} y={g + 6} rx={430} />
					<Oreiller x={hx - 70} y={g - 26} />
					<Bonhomme pose={poseCote(fx, hx, g)} humeur="dort" rempli={r} de={[fx, hx]} />
					<FlecheHaut x={232} y={655} h={110} l={40} couleur={GRIS} />
					<Etiquette x={145} y={720} texte="1,85 m" couleur={GRIS} taille={46} />
				</Camera>
			</Plan>
		);
	}
	const r = interpolate(f, [6, filer + 4], [0, 1], {...clamp, easing: io});
	const monte = interpolate(f, [filer, methode + 16], [0, 1], {...clamp, easing: io});
	const haut = 560 - 300 * monte;
	const valeur = 1.85 + (2.9 - 1.85) * monte;
	const radio = interpolate(f, [methode - 2, methode + 4], [0, 1], clamp);
	const fl = f >= filer ? ressort(f - filer, 200, 12) : 0;
	return (
		<Plan>
			<Camera
				f={f}
				cles={[
					[0, 540, 960, 1.0],
					[filer, 540, 950, 1.03],
					[methode + 16, 330, 760, 1.85],
					[d, 310, 730, 1.95],
				]}
			>
				<Toise x={90} haut={haut} bas={1350} filter={monte > 0.05 ? 'url(#halo-vert)' : undefined} />
				<Ombre x={600} y={g + 6} rx={430} />
				<Oreiller x={hx - 70} y={g - 26} />
				<Bonhomme pose={poseCote(fx, hx, g)} humeur="dort" rempli={r} de={[fx, hx]} radio={radio} />
				{fl > 0 ? <FlecheHaut x={240} y={haut + 95} h={150 * fl} l={52} couleur={VERT} filter="url(#halo-vert)" /> : null}
				<Etiquette x={145} y={haut + 160} texte={`${valeur.toFixed(2).replace('.', ',')} m`} couleur={VERT} taille={46} filter="url(#halo-vert)" />
			</Camera>
		</Plan>
	);
};

/** 3. Gros plan colonne : les vertèbres s'allument une à une, le cadenas s'ouvre. */
const PlanColonne: React.FC<{f: number; d: number; allume: number; ouvre: number}> = ({f, d, allume, ouvre}) => {
	const xs = (y: number) => 590 + 95 * Math.sin(((y - 100) / 900) * Math.PI);
	const pas = 102;
	const vert = [];
	const n = 24;
	for (let i = 0; i < n; i++) {
		const y = 2300 - i * pas;
		const ang = (Math.atan2(xs(y + 1) - xs(y - 1), 2) * 180) / Math.PI;
		const a = interpolate(f, [allume + i * 1.6, allume + i * 1.6 + 5], [0, 1], clamp);
		vert.push(<VertebreFace key={i} x={xs(y)} y={y} ang={ang} w={250} h={88} allume={a} />);
	}
	const pts = Array.from({length: 40}, (_, i) => -200 + i * 70).map((y) => `${xs(y)},${y}`).join(' ');
	const ouv = interpolate(f, [ouvre, ouvre + 7], [0, 1], {...clamp, easing: sortie});
	const chute = interpolate(f, [ouvre + 8, ouvre + 22], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const ly = 820;
	const etincelles = Array.from({length: 26}, (_, i) => {
		const y0 = (i * 397) % 2200;
		const y = y0 - ((f * (6 + (i % 5))) % 2200);
		const x = xs(y) + ((i * 137) % 360) - 180;
		return <circle key={i} cx={x} cy={y} r={3 + (i % 3) * 2} fill="#e9fdff" opacity={0.85} />;
	});
	return (
		<Plan fond="#f4f6f8">
			<Camera f={f} cles={[[0, 580, 1180, 1.05], [d, 560, 980, 1.12]]}>
				<polyline points={pts} fill="none" stroke="#38b6ff" strokeWidth={430} strokeLinecap="round" opacity={0.55} style={{filter: 'blur(40px)'}} />
				<polyline points={pts} fill="none" stroke="#9fe2ff" strokeWidth={300} strokeLinecap="round" opacity={0.6} style={{filter: 'blur(22px)'}} />
				{etincelles}
				{vert}
				<Oreiller x={200} y={330} rx={170} ry={58} />
				<Tete x={210} y={250} r={92} humeur="dort" rot={-12} />
				<g opacity={1 - chute} transform={`translate(0 ${chute * 260}) rotate(${chute * 25} ${xs(ly)} ${ly})`}>
					<Cadenas x={xs(ly)} y={ly + 40} s={0.95} ouvert={ouv} filter="url(#halo-rouge)" couleur={mix(ROUGE, VERT, ouv) as string} />
				</g>
			</Camera>
		</Plan>
	);
};

/** 4-5. Deux bonshommes (petit triste / grand content), flèche courbe ; puis gros plan croix / coche. */
const PlanDeux: React.FC<{f: number; d: number; zoom: boolean; croix?: number; coche?: number; pop?: number}> = ({f, d, zoom, croix = 1e9, coche = 1e9, pop = 1e9}) => {
	const g = 1260;
	const trace = zoom ? 1 : interpolate(f, [0, 10], [0, 1], {...clamp, easing: sortie});
	const cx = f >= croix ? ressort(f - croix, 260, 11) : 0;
	const co = f >= coche ? ressort(f - coche, 260, 10) : 0;
	const bump = f >= pop ? 1 + 0.25 * Math.sin(Math.min(1, (f - pop) / 8) * Math.PI) : 1;
	const arc = 'M 120 1430 Q 560 1700 980 1420';
	const cles: Cle[] = zoom
		? [
				[0, 330, 900, 2.0],
				[d * 0.35, 360, 880, 1.95],
				[d, 570, 860, 1.72],
			]
		: [
				[0, 540, 1080, 1.0],
				[d, 540, 1060, 1.05],
			];
	return (
		<Plan>
			<defs>
				<linearGradient id="arc" x1="0" x2="1">
					<stop offset="0" stopColor={ORANGE} />
					<stop offset="1" stopColor={VERT} />
				</linearGradient>
			</defs>
			<Camera f={f} cles={cles}>
				<Ombre x={540} y={g + 8} rx={420} ry={26} />
				<Toise x={515} haut={500} bas={g + 10} />
				<Bonhomme pose={poseDebout(320, g, 540, 'bas')} humeur="triste" />
				<Bonhomme pose={poseDebout(775, g, 690, 'hanches')} humeur="content" />
				<g opacity={trace > 0 ? 1 : 0}>
					<path d={arc} fill="none" stroke={ENCRE} strokeWidth={118} pathLength={1} strokeDasharray={`${trace} 1`} />
					<path d={arc} fill="none" stroke="url(#arc)" strokeWidth={100} pathLength={1} strokeDasharray={`${trace} 1`} />
					{trace > 0.92 ? <path d="M 930 1330 L 1060 1400 L 960 1510 Z" fill={VERT} stroke={ENCRE} strokeWidth={O} strokeLinejoin="round" /> : null}
				</g>
				{cx > 0 ? <Croix x={320} y={500} s={0.9 * cx} /> : null}
				{co > 0 ? <Coche x={780} y={360} s={1.05 * co * bump} filter="url(#halo-vert)" /> : null}
			</Camera>
		</Plan>
	);
};

/** Silhouette noire couchée sur le dos (tête à gauche), colonne cyan qui se déploie. */
const PlanSilhouette: React.FC<{f: number; d: number; deploie: number}> = ({f, d, deploie}) => {
	const e = interpolate(f, [deploie, deploie + 16], [0, 1], {...clamp, easing: io});
	const pas = 66 * (1 + 0.18 * e);
	const n = 14;
	const x0 = 380;
	const fin = x0 + (n - 1) * pas;
	const vert = [];
	for (let i = 0; i < n; i++) {
		const x = x0 + i * pas;
		const y = 1058 - Math.sin((i / (n - 1)) * Math.PI) * 18;
		if (i < n - 1) vert.push(<Disque key={`d${i}`} x={x + pas / 2} y={y - 6} ang={90} s={0.6} couleur="#e6fdff" />);
		vert.push(<VertebreProfil key={i} x={x} y={y - 8} ang={90} s={0.6} corps="#9ff7ff" bord="#05b4d2" filter="url(#halo-cyan)" />);
	}
	// corps couché sur le dos, tête à gauche : poitrine, ventre, bassin, jambes (au-delà de l'écran)
	const corps = `M 300 1000 C 330 900 430 860 560 862 C 700 868 820 900 ${fin - 60} 935 C ${fin + 40} 975 ${fin + 140} 985 ${fin + 240} 1000
		C ${fin + 400} 1015 ${fin + 700} 1020 ${fin + 1100} 1030 C ${fin + 1150} 1035 ${fin + 1150} 1105 ${fin + 1100} 1110
		C ${fin + 700} 1140 ${fin + 400} 1150 ${fin + 200} 1158 C 900 1168 600 1172 400 1166 C 330 1160 292 1120 300 1000 Z`;
	const lueur = 0.6 + 0.4 * Math.sin(f / 5) ** 2;
	const ti = interpolate(f, [deploie - 6, deploie + 4], [0, 1], {...clamp, easing: sortie});
	return (
		<Plan fond="url(#studio)">
			<defs>
				<radialGradient id="studio" cx="50%" cy="40%" r="80%">
					<stop offset="0" stopColor="#f2f2f2" />
					<stop offset="1" stopColor="#bdbdbd" />
				</radialGradient>
				<linearGradient id="peau" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#474747" />
					<stop offset="0.3" stopColor="#151515" />
					<stop offset="1" stopColor="#050505" />
				</linearGradient>
			</defs>
			<Camera f={f} cles={[[0, 470, 1150, 1.5], [d, 860, 1140, 1.25]]}>
				<ellipse cx={1300} cy={1160} rx={1400} ry={36} fill="#000" opacity={0.2} style={{filter: 'blur(12px)'}} />
				<Oreiller x={230} y={1112} rx={230} ry={50} />
				<circle cx={215} cy={985} r={108} fill="url(#peau)" />
				<path d="M 290 960 C 320 950 340 960 340 990 L 340 1090 L 290 1100 Z" fill="#111" />
				<path d={corps} fill="url(#peau)" />
				<clipPath id="dans-corps">
					<path d={corps} />
				</clipPath>
				<g clipPath="url(#dans-corps)">
					<line x1={x0 - 60} y1={1050} x2={fin + 60} y2={1050} stroke={CYAN} strokeWidth={170} strokeLinecap="round" opacity={0.45 * lueur} style={{filter: 'blur(34px)'}} />
				</g>
				{vert}
			</Camera>
			<g opacity={ti} transform={`translate(${-120 * (1 - ti)} 0)`}>
				<Toise x={-10} haut={-20} bas={760} />
				<Etiquette x={50} y={110} texte="1,85 m ↑" couleur={VERT} taille={58} filter="url(#halo-vert)" />
			</g>
		</Plan>
	);
};

/** 8. Écran partagé : colonne éteinte bloquée (gauche) / colonne lumineuse (droite). */
const PlanPartage: React.FC<{f: number; d: number; bloque: number; nain: number}> = ({f, d, bloque, nain}) => {
	const tasse = interpolate(f, [nain, nain + 8], [0, 1], {...clamp, easing: sortie});
	const slam = f >= bloque ? ressort(f - bloque, 320, 9) : 0;
	const gauche = [];
	const droite = [];
	for (let i = 0; i < 14; i++) {
		const yg = 1960 - i * (150 - 18 * tasse);
		const yd = 1960 - i * 160;
		const pg = 150 - 18 * tasse;
		gauche.push(<Disque key={`d${i}`} x={232 + Math.sin(i / 2.2) * 26} y={yg - pg / 2} ang={8 * Math.sin(i / 2.2)} s={1.25} couleur="#4a4a4a" />);
		gauche.push(<VertebreProfil key={i} x={250 + Math.sin(i / 2.2) * 26} y={yg} ang={8 * Math.sin(i / 2.2)} s={1.25} corps="#2c2c2c" bord="#5e5e5e" />);
		droite.push(<Disque key={`d${i}`} x={742 + Math.sin(i / 2.2) * 26} y={yd - 80} ang={8 * Math.sin(i / 2.2)} s={1.25} couleur="#e8feff" />);
		droite.push(<VertebreProfil key={i} x={760 + Math.sin(i / 2.2) * 26} y={yd} ang={8 * Math.sin(i / 2.2)} s={1.25} corps="#a6f7ff" bord="#06a9c9" filter="url(#halo-cyan)" />);
	}
	const bulles = Array.from({length: 18}, (_, i) => {
		const y = 2000 - ((f * (5 + (i % 4)) + i * 211) % 2100);
		return <circle key={i} cx={600 + ((i * 89) % 420)} cy={y} r={3 + (i % 3) * 2} fill="#e0fdff" opacity={0.8} />;
	});
	return (
		<Plan fond="#f1f4f6">
			<Camera f={f} cles={[[0, 540, 960, 1.0], [d, 540, 980, 1.1]]}>
				<rect x={-400} y={-400} width={940} height={2800} fill="#8a8a8a" />
				<rect x={-400} y={-400} width={940} height={2800} fill="#000" opacity={0.25 * tasse} />
				<rect x={540} y={-400} width={900} height={2800} fill="#eefcff" />
				<rect x={540} y={-400} width={900} height={2800} fill="#5fd8ff" opacity={0.18} />
				{bulles}
				{gauche}
				{droite}
				<line x1={540} y1={-400} x2={540} y2={2400} stroke={ENCRE} strokeWidth={10} />
				<Cadenas x={250} y={1740} s={0.95 * (1 + 0.4 * (f >= bloque ? 1 - slam : 0))} couleur={f >= bloque ? ROUGE : '#3a3a3a'} filter={f >= bloque ? 'url(#halo-rouge)' : undefined} />
			</Camera>
		</Plan>
	);
};

/** 9. Bonhomme qui pointe la bulle de commentaire, puis déluge de commentaires. */
const PlanCommentaire: React.FC<{f: number; d: number; pointe: number; tape: number; deluge: number}> = ({f, d, pointe, tape, deluge}) => {
	const p = interpolate(f, [pointe, pointe + 6], [0, 1], {...clamp, easing: sortie});
	const texte = '1m72'.slice(0, Math.max(0, Math.min(4, Math.floor((f - tape) / 3) + 1)));
	const bulle = f >= tape - 2 ? ressort(f - tape + 2, 300, 12) : 0;
	const tailles = ['1m60', '1m80', '1m68', '1m75', '1m65', '1m82', '1m71', '1m58', '1m77', '1m90', '1m63', '1m70', '1m85', '1m66', '1m79'];
	const flot = [];
	for (let i = 0; i < 46; i++) {
		const t0 = deluge + i * 0.75;
		if (f < t0) continue;
		const k = ressort(f - t0, 120, 13);
		const x = 60 + ((i * 263) % 960);
		const y1 = 1420 + ((i * 151) % 460);
		const y = 2100 + (y1 - 2100) * k;
		const s = 0.8 + ((i * 37) % 50) / 100;
		const rot = ((i * 53) % 16) - 8;
		const txt = tailles[i % tailles.length];
		flot.push(
			<g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter="url(#ombre)">
				<rect x={-92} y={-40} width={184} height={80} rx={40} fill="#fff" stroke="#d0d0d0" strokeWidth={3} />
				<text x={0} y={16} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={44} fill={ENCRE}>
					{txt}
				</text>
			</g>,
		);
	}
	return (
		<Plan fond="url(#gris9)">
			<defs>
				<radialGradient id="gris9" cx="50%" cy="38%" r="80%">
					<stop offset="0.3" stopColor="#ffffff" />
					<stop offset="1" stopColor="#b9b9b9" />
				</radialGradient>
			</defs>
			<Camera f={f} cles={[[0, 540, 960, 1.0], [d, 540, 1000, 1.08]]}>
				<Ombre x={560} y={1340} rx={200} ry={20} />
				<Bonhomme pose={poseDebout(560, 1330, 860, 'pointe', p)} humeur="sourire" />
				{bulle > 0 ? (
					<g transform={`translate(400 1200) scale(${bulle})`} filter="url(#ombre)">
						<rect x={-110} y={-46} width={220} height={92} rx={46} fill="#5c5c5c" stroke={ENCRE} strokeWidth={5} />
						<text x={0} y={18} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={50} fill="#fff">
							{texte}
						</text>
					</g>
				) : null}
				{flot}
			</Camera>
		</Plan>
	);
};

/** 10. Fin : fiche Grandimi qui tombe en haut, téléphone qui monte en bas, lien grandimi.com. */
const PlanFin: React.FC<{f: number}> = ({f}) => {
	const c = ressort(f, 170, 13);
	const t = ressort(f - 4, 150, 14);
	const ouvre = interpolate(f, [16, 26], [0, 1], {...clamp, easing: sortie});
	return (
		<AbsoluteFill>
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute'}}>
				<Defs />
				<Fond />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: 60,
					right: 60,
					top: 150,
					height: 380,
					borderRadius: 44,
					background: '#141414',
					boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
					transform: `translateY(${(1 - c) * -700}px) rotate(${(1 - c) * -8}deg)`,
					display: 'flex',
					alignItems: 'center',
					gap: 40,
					padding: '0 50px',
					fontFamily: 'Poppins',
					color: '#fff',
				}}
			>
				<div
					style={{
						width: 200,
						height: 200,
						flex: 'none',
						borderRadius: 48,
						background: 'linear-gradient(145deg, #ff8a52 0%, #ff5a1f 55%, #e8430e 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<svg width={100} height={124} viewBox="0 0 50 62">
						<circle cx="25" cy="8" r="7" fill="#fff" />
						<path d="M14 19 h22 a4 4 0 0 1 4 4 v14 a3 3 0 0 1 -6 0 v-9 h-1 v30 a4 4 0 0 1 -8 0 v-17 h-0 v17 a4 4 0 0 1 -8 0 v-30 h-1 v9 a3 3 0 0 1 -6 0 v-14 a4 4 0 0 1 4 -4 z" fill="#fff" />
						<path d="M44 40 L44 6 M40 10 L44 5 L48 10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
					</svg>
				</div>
				<div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
					<div style={{fontWeight: 800, fontSize: 62, lineHeight: 1}}>Grandimi</div>
					<div style={{fontWeight: 800, fontSize: 36, color: '#bdbdbd', lineHeight: 1.1}}>Maximise ta taille</div>
					<div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, background: '#ff5a1f', borderRadius: 999, padding: '10px 28px', fontWeight: 800, fontSize: 40, alignSelf: 'flex-start'}}>
						🔗 grandimi.com
					</div>
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					left: 300,
					width: 480,
					top: 1260,
					height: 900,
					borderRadius: 70,
					background: ENCRE,
					padding: 18,
					transform: `translateY(${(1 - t) * 800}px)`,
					boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
				}}
			>
				<div
					style={{
						width: '100%',
						height: '100%',
						borderRadius: 54,
						background: mix('#f5f5f5', '#ff6a26', ouvre),
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						paddingTop: 120,
						gap: 24,
						fontFamily: 'Poppins',
						fontWeight: 800,
						color: '#fff',
					}}
				>
					<div style={{transform: `scale(${0.4 + 0.6 * ouvre})`, opacity: ouvre}}>
						<svg width={120} height={150} viewBox="0 0 50 62">
							<circle cx="25" cy="8" r="7" fill="#fff" />
							<path d="M14 19 h22 a4 4 0 0 1 4 4 v14 a3 3 0 0 1 -6 0 v-9 h-1 v30 a4 4 0 0 1 -8 0 v-17 h-0 v17 a4 4 0 0 1 -8 0 v-30 h-1 v9 a3 3 0 0 1 -6 0 v-14 a4 4 0 0 1 4 -4 z" fill="#fff" />
						</svg>
					</div>
					<div style={{fontSize: 52, opacity: ouvre}}>Grandimi</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};

/* =================== Sous-titres karaoké =================== */

type MotST = {txt: string; f: number};
type Groupe = {debut: number; mots: MotST[]};

const construireGroupes = (groupes: string[], mots: Mot[]): Groupe[] => {
	let k = 0;
	return groupes.map((g) => {
		const ms = g.split(' ').map((tok) => {
			const [txt, n] = tok.split('@');
			const f = Math.round(mots[k].t * FPS);
			k += n ? Number(n) : 1;
			return {txt, f};
		});
		return {debut: ms[0].f - 2, mots: ms};
	});
};

const SousTitres: React.FC<{groupes: Groupe[]; fin: number}> = ({groupes, fin}) => {
	const f = useCurrentFrame();
	let gi = -1;
	for (let i = 0; i < groupes.length; i++) if (f >= groupes[i].debut) gi = i;
	if (gi < 0) return null;
	const g = groupes[gi];
	const finG = gi + 1 < groupes.length ? groupes[gi + 1].debut : fin;
	if (f >= finG) return null;
	const e = ressort(f - g.debut, 400, 16);
	let actif = 0;
	g.mots.forEach((m, i) => {
		if (f >= m.f - 1) actif = i;
	});
	return (
		<div
			style={{
				position: 'absolute',
				top: 1040,
				left: 30,
				right: 30,
				transform: `translateY(-50%) scale(${0.82 + 0.18 * e})`,
				display: 'flex',
				justifyContent: 'center',
				flexWrap: 'wrap',
				gap: '0 12px',
				fontFamily: "'Bebas Neue', sans-serif",
				fontSize: 112,
				lineHeight: 1.05,
				letterSpacing: 1.5,
				textTransform: 'uppercase',
			}}
		>
			{g.mots.map((m, i) => {
				const on = i === actif;
				const p = on ? ressort(f - Math.max(g.debut, m.f - 1), 500, 18) : 0;
				return (
					<span key={i} style={{position: 'relative', display: 'inline-block', padding: '0 12px'}}>
						{on ? (
							<span
								style={{
									position: 'absolute',
									inset: '-6px -6px 2px',
									background: '#ff5a1f',
									border: `5px solid ${ENCRE}`,
									borderRadius: 14,
									transform: `scale(${0.6 + 0.4 * p}) rotate(-2deg)`,
									boxShadow: '0 6px 0 rgba(0,0,0,0.35)',
								}}
							/>
						) : null}
						<span style={{position: 'relative', color: '#fff', WebkitTextStroke: `16px ${ENCRE}`, paintOrder: 'stroke fill'}}>{m.txt}</span>
					</span>
				);
			})}
		</div>
	);
};

/* =================== Montage =================== */

const Rendu: React.FC<{d: number; rendu: (f: number, d: number) => React.ReactNode}> = ({d, rendu}) => <>{rendu(useCurrentFrame(), d)}</>;

const PlanSeq: React.FC<{de: number; a: number; rendu: (f: number, d: number) => React.ReactNode}> = ({de, a, rendu}) => (
	<Sequence from={de} durationInFrames={a - de}>
		<Rendu d={a - de} rendu={rendu} />
	</Sequence>
);

const Son: React.FC<{a: number; src: string; v: number}> = ({a, src, v}) => (
	<Sequence from={Math.max(0, a)} durationInFrames={60} layout="none">
		<Audio src={staticFile(`sfx/${src}.wav`)} volume={v} />
	</Sequence>
);

export const Dormir: React.FC<DormirProps> = ({mots, groupes, totalFrames}) => {
	usePolices();
	if (!mots || !groupes || !totalFrames) return null;
	const A = (w: string, n = 1) => ancre(mots, w, n);
	const END = totalFrames;
	// Coupes, calées comme dans l'original (fiche) sur les mots de la voix.
	const c1 = A('je') - 4;
	const c2 = A('dormir') - 5;
	const c3 = A('ta');
	const c4 = A('pour', 2) - 2;
	const c5 = A('85') + 3;
	const c6 = A('en') - 1;
	const c7 = A('et', 2) - 1;
	const c8 = A('mais') + 2;
	const c9 = A('methode', 3) + 4;
	const coupes = [c1, c2, c3, c4, c5, c6, c7, c8, c9];
	const G = construireGroupes(groupes, mots);
	return (
		<AbsoluteFill style={{background: '#fff'}}>
			<Audio src={staticFile(`${DIR}/voice/voix.wav`)} />
			<Audio src={staticFile('sfx/music.wav')} loop volume={(fr) => interpolate(fr, [0, 8, END - 12, END], [0, 0.08, 0.08, 0], clamp)} />
			{coupes.map((c, i) => (
				<Son key={i} a={c - 3} src="whoosh" v={0.2} />
			))}
			<Son a={A('1m70')} src="slam" v={0.3} />
			<Son a={A('filer')} src="roulement" v={0.25} />
			<Son a={A('et')} src="sparkle" v={0.3} />
			<Son a={A('maximiser') + 2} src="crack" v={0.25} />
			<Son a={A('atteindre')} src="wrong" v={0.18} />
			<Son a={A('au')} src="ding" v={0.28} />
			<Son a={A('bloquee')} src="slam" v={0.3} />
			<Son a={A('depose')} src="tick" v={0.25} />
			<Son a={A('taille', 2)} src="pop" v={0.2} />
			<Son a={c9 + 2} src="pop" v={0.25} />

			<PlanSeq de={0} a={c1} rendu={(f, d) => <PlanDos f={f} d={d} stress={A('1m70')} />} />
			<PlanSeq de={c1} a={c2} rendu={(f, d) => <PlanCote f={f} d={d} filer={A('filer') - c1} methode={A('methode') - c1} />} />
			<PlanSeq de={c2} a={c3} rendu={(f, d) => <PlanColonne f={f} d={d} allume={A('et') - c2} ouvre={A('maximiser') - c2 + 2} />} />
			<PlanSeq de={c3} a={c4} rendu={(f, d) => <PlanDeux f={f} d={d} zoom={false} />} />
			<PlanSeq de={c4} a={c5} rendu={(f, d) => <PlanDeux f={f} d={d} zoom croix={A('atteindre') - c4} coche={A('au') - c4} pop={A('1') - c4} />} />
			<PlanSeq de={c5} a={c6} rendu={(f, d) => <PlanCote f={f} d={d} filer={0} methode={0} gris />} />
			<PlanSeq de={c6} a={c7} rendu={(f, d) => <PlanSilhouette f={f} d={d} deploie={A('colonne') - c6} />} />
			<PlanSeq de={c7} a={c8} rendu={(f, d) => <PlanPartage f={f} d={d} bloque={A('bloquee') - c7} nain={A('nain') - c7} />} />
			<PlanSeq de={c8} a={c9} rendu={(f, d) => <PlanCommentaire f={f} d={d} pointe={A('donner') - c8} tape={A('depose') - c8} deluge={A('taille', 2) - c8} />} />
			<PlanSeq de={c9} a={END} rendu={(f) => <PlanFin f={f} />} />

			<SousTitres groupes={G} fin={END} />
		</AbsoluteFill>
	);
};
