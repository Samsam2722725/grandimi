import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Vidéo « explicative » recopiée de la référence p25-ref (36 s, fond gris clair, bonshommes-gélules) :
 * en-tête rouge (« ▪ RÉPONSE »), phrase qui s'écrit mot par mot en haut à gauche (mots-clés en gras noir),
 * bonshommes à l'échelle posés sur un sol, pastilles de taille au-dessus des têtes, noms en dessous.
 * Cinq scènes : la question, Michael Jordan (Letterman, le livreur de lait), la science (grands-parents,
 * gènes non utilisés, le bon mélange), sa fourchette (prédiction Grandimi), à toi (envoie, commente).
 * Tous les moments sont des numéros d'image (absolus) calculés depuis la voix ; t[nom] dans `ancres`.
 */
const W = 1080;
const ROUGE = '#d7262e';
const NOIR = '#151515';
const GRIS = '#7d7d7d';
const GRIS_CLAIR = '#a3a3a3';

export type MotExplicatif = {w: string; f: number; gras?: boolean};
export type PhraseExplicatif = {titre: string; de: number; a: number; mots: MotExplicatif[]};

const ressort = (f: number, at: number, k = 190, d = 14) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping: d, stiffness: k, mass: 0.6}}));
const fondu = (f: number, at: number, d = 6) => interpolate(f, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Bonhomme-gélule : tête ronde avec visage, corps en gélule, bras le long du corps (ou levé), pieds. */
const Bonhomme: React.FC<{
	x: number;
	sol: number;
	h: number;
	couleur: string;
	pieds?: string;
	bras?: number;
	num?: string;
	visage?: string;
	bouteille?: boolean;
	pas?: number;
	opacite?: number;
	points?: number;
}> = ({x, sol, h, couleur, pieds, bras = 0, num, visage, bouteille, pas = 0, opacite = 1, points = 0}) => {
	if (h < 4) return null;
	const r = 0.07 * h;
	const tete = sol - h + r;
	const cou = tete + r + 0.012 * h;
	const lw = 0.118 * h;
	const yeux = visage ?? (couleur === NOIR || couleur === ROUGE ? '#fff' : '#3d3d3d');
	const epaule = {x: x + lw * 0.28, y: cou + 0.04 * h};
	const angle = -165 * bras + 6 * Math.sin(pas);
	const brasL = 0.4 * h;
	const rebond = -Math.abs(Math.sin(pas)) * 0.015 * h;
	const corps = (
		<g transform={`translate(0 ${rebond})`}>
			<circle cx={x} cy={tete} r={r} fill={couleur} />
			<rect x={x - lw / 2} y={cou} width={lw} height={sol - cou - 0.02 * h} rx={lw / 2} fill={couleur} />
			<g transform={`rotate(${angle} ${epaule.x} ${epaule.y})`}>
				<rect x={epaule.x - 0.032 * h} y={epaule.y - 0.02 * h} width={0.064 * h} height={brasL} rx={0.032 * h} fill={couleur} />
				{bouteille ? <rect x={epaule.x - 0.03 * h} y={epaule.y + brasL - 0.04 * h} width={0.06 * h} height={0.1 * h} rx={6} fill="#fff" stroke="#333" strokeWidth={3} /> : null}
			</g>
			{/* visage */}
			<circle cx={x - r * 0.32} cy={tete - r * 0.1} r={r * 0.09} fill={yeux} />
			<circle cx={x + r * 0.32} cy={tete - r * 0.1} r={r * 0.09} fill={yeux} />
			<path d={`M${x - r * 0.3},${tete + r * 0.28} Q${x},${tete + r * 0.52} ${x + r * 0.3},${tete + r * 0.28}`} stroke={yeux} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />
			{num ? (
				<text x={x} y={cou + 0.17 * h} textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight={900} fontSize={0.062 * h}>
					{num}
				</text>
			) : null}
			{points > 0 ? <circle cx={x} cy={cou + 0.12 * h} r={0.035 * h * points} fill={ROUGE} stroke="#fff" strokeWidth={3} /> : null}
		</g>
	);
	return (
		<g opacity={opacite}>
			{/* traînée claire derrière (comme l'original) */}
			<g opacity={0.22} transform="translate(-10 0)">
				{corps}
			</g>
			{corps}
			<ellipse cx={x - lw * 0.18} cy={sol - 0.01 * h} rx={lw * 0.42} ry={0.022 * h} fill={pieds ?? couleur} />
			<ellipse cx={x + lw * 0.2} cy={sol - 0.01 * h} rx={lw * 0.42} ry={0.022 * h} fill={pieds ?? couleur} />
		</g>
	);
};

/** Pastille arrondie (taille au-dessus d'une tête, légendes). */
const Pastille: React.FC<{x: number; y: number; texte: string; fond?: string; taille?: number; f: number; at: number; contour?: boolean}> = ({
	x,
	y,
	texte,
	fond = '#2b2b2b',
	taille = 34,
	f,
	at,
	contour,
}) => {
	if (f < at) return null;
	const s = ressort(f, at, 260, 12);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - 500,
				width: 1000,
				top: y,
				display: 'flex',
				justifyContent: 'center',
				transform: `scale(${s})`,
				transformOrigin: '50% 50%',
			}}
		>
			<div
				style={{
					background: contour ? '#fff' : fond,
					color: contour ? NOIR : '#fff',
					border: contour ? `3px solid ${NOIR}` : undefined,
					borderRadius: taille,
					padding: `${taille * 0.28}px ${taille * 0.7}px`,
					fontFamily: FONT,
					fontWeight: 800,
					fontSize: taille,
					whiteSpace: 'nowrap',
					boxShadow: contour ? '0 6px 14px rgba(0,0,0,0.15)' : undefined,
				}}
			>
				{texte}
			</div>
		</div>
	);
};

const Nom: React.FC<{x: number; y: number; texte: string; couleur?: string; f: number; at?: number}> = ({x, y, texte, couleur = '#2e2e2e', f, at = 0}) =>
	f < at ? null : (
		<div style={{position: 'absolute', left: x - 300, width: 600, top: y, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: 1, color: couleur, opacity: fondu(f, at, 5)}}>
			{texte}
		</div>
	);

/** debut : image absolue où commence le plan (les moments de `t` et des phrases sont absolus) ; fin : dernière image de la vidéo. */
export const Explicatif: React.FC<{phrases: PhraseExplicatif[]; t: Record<string, number>; v: Record<string, string>; fin: number; debut?: number}> = ({
	phrases,
	t,
	v,
	fin,
	debut = 0,
}) => {
	const f = useCurrentFrame() + debut;
	const scene = f < t.mj ? 1 : f < t.sci ? 2 : f < t.range ? 3 : f < t.send ? 4 : 5;
	const debutScene = [0, 0, t.mj, t.sci, t.range, t.send][scene];
	const finScene = [0, t.mj, t.sci, t.range, t.send, fin][scene];
	const pousse = 1 + 0.03 * interpolate(f, [debutScene, finScene], [0, 1], {extrapolateRight: 'clamp'});
	const entreeScene = interpolate(f, [debutScene, debutScene + 5], [1.06, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const ph = phrases.filter((p) => f >= p.de && f < p.a).pop();
	const K = 3.25; // pixels par cm (scènes 1, 2, 4)
	const SOL = 1545;

	let contenu: React.ReactNode = null;
	if (scene === 1) {
		const leve = ressort(f, t.how, 120, 12);
		const titre = ressort(f, 4, 200, 13);
		contenu = (
			<>
				<div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', transform: `scale(${titre})`}}>
					<div style={{fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 112, color: ROUGE, lineHeight: 1, letterSpacing: -1}}>
						COMMENT IL FAIT {v.lui.toUpperCase()} ?
					</div>
					<div style={{fontFamily: FONT, fontWeight: 800, fontSize: 36, color: NOIR, marginTop: 14}}>
						MÈRE {v.mere.toUpperCase()} · PÈRE {v.pere.toUpperCase()} · IL A {v.age} ANS
					</div>
				</div>
				<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
					<Bonhomme x={175} sol={SOL} h={168 * K} couleur={GRIS_CLAIR} />
					<Bonhomme x={370} sol={SOL} h={178 * K} couleur={GRIS} />
					<Bonhomme x={680} sol={SOL} h={185 * K} couleur={NOIR} pieds={ROUGE} bras={Math.min(1.05, leve)} />
					{f >= t.lui ? (
						<line x1={370} x2={980} y1={SOL - 185 * K} y2={SOL - 185 * K} stroke={ROUGE} strokeWidth={3} strokeDasharray="12 9" opacity={fondu(f, t.lui, 8)} />
					) : null}
				</svg>
				<Pastille x={175} y={SOL - 168 * K - 92} texte={v.mere} f={f} at={t.mere} />
				<Pastille x={370} y={SOL - 178 * K - 92} texte={v.pere} f={f} at={t.pere} />
				<Pastille x={680} y={SOL - 185 * K - 92} texte={v.lui} fond={ROUGE} f={f} at={t.lui} />
				<Pastille x={905} y={SOL - 185 * K - 30} texte={v.ecart} fond={ROUGE} taille={30} f={f} at={t.lui + 10} />
				<Nom x={175} y={SOL + 26} texte="MÈRE" f={f} />
				<Nom x={370} y={SOL + 26} texte="PÈRE" f={f} />
				<Nom x={680} y={SOL + 26} texte={`LUI · ${v.age}`} f={f} />
			</>
		);
	} else if (scene === 2) {
		const g = f - t.mj;
		const jordan = interpolate(g, [0, 10], [0.6, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
		const marche = interpolate(f, [t.livreur, t.livreur + 24], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		contenu = (
			<>
				<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
					<Bonhomme x={140} sol={SOL} h={178 * K} couleur={GRIS} />
					<Bonhomme x={330} sol={SOL} h={165 * K} couleur={GRIS_CLAIR} />
					<Bonhomme x={560} sol={SOL} h={198 * K * jordan} couleur={ROUGE} pieds={NOIR} num="23" />
					{f >= t.livreur ? (
						<Bonhomme x={900 + 420 * marche} sol={SOL} h={201 * K} couleur="#b6b6b6" bouteille pas={marche > 0.01 ? (f - t.livreur) / 2.2 : 0} bras={0.1} />
					) : null}
				</svg>
				<Pastille x={140} y={SOL - 178 * K - 92} texte={v.mjPere} f={f} at={t.mjPere} />
				<Pastille x={330} y={SOL - 165 * K - 92} texte={v.mjMere} f={f} at={t.mjMere} />
				<Pastille x={560} y={SOL - 198 * K - 92} texte={v.mj} fond={ROUGE} f={f} at={t.mjTaille} />
				<Pastille x={420} y={520} texte="LETTERMAN · 1989" f={f} at={t.letterman} />
				<Pastille x={420} y={640} texte={`« le livreur de lait fait environ ${v.livreur} »`} contour taille={30} f={f} at={t.livreur} />
				<Pastille x={420} y={760} texte="IL PLAISANTAIT" fond={ROUGE} taille={24} f={f} at={t.blague} />
				<Pastille x={900} y={SOL - 201 * K - 92} texte={`LIVREUR ${v.livreur}`} f={f} at={t.blague} taille={28} />
				<Nom x={140} y={SOL + 26} texte="PÈRE" f={f} />
				<Nom x={330} y={SOL + 26} texte="MÈRE" f={f} />
				<Nom x={560} y={SOL + 26} texte="MICHAEL JORDAN" couleur={ROUGE} f={f} />
			</>
		);
	} else if (scene === 3) {
		const K3 = 2.1;
		const P = 1235; // estrade des parents
		const GP = 880; // estrade des grands-parents
		const gp = ressort(f, t.grandsParents, 150, 13);
		const leve = ressort(f, t.chance, 120, 12);
		const SOL3 = 1610;
		contenu = (
			<>
				<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
					<line x1={170} x2={910} y1={P} y2={P} stroke="#bdbdbd" strokeWidth={4} />
					<Bonhomme x={220} sol={P} h={178 * K3} couleur={GRIS} points={f >= t.gene ? ressort(f, t.gene, 220, 12) : 0} />
					<Bonhomme x={860} sol={P} h={168 * K3} couleur={GRIS_CLAIR} points={f >= t.gene ? ressort(f, t.gene + 4, 220, 12) : 0} />
					{gp > 0.01 ? (
						<g opacity={Math.min(1, gp)} transform={`translate(0 ${(1 - Math.min(1, gp)) * -60})`}>
							<line x1={90} x2={330} y1={GP} y2={GP} stroke="#c8c8c8" strokeWidth={3} />
							<line x1={750} x2={990} y1={GP} y2={GP} stroke="#c8c8c8" strokeWidth={3} />
							<line x1={210} x2={220} y1={GP + 4} y2={P - 178 * K3 - 30} stroke="#cfcfcf" strokeWidth={2} />
							<line x1={870} x2={860} y1={GP + 4} y2={P - 168 * K3 - 30} stroke="#cfcfcf" strokeWidth={2} />
							<Bonhomme x={135} sol={GP} h={170 * 1.6} couleur={GRIS_CLAIR} opacite={0.85} />
							<Bonhomme x={285} sol={GP} h={185 * 1.6} couleur={GRIS} opacite={0.85} points={1} />
							<Bonhomme x={800} sol={GP} h={183 * 1.6} couleur={GRIS} opacite={0.85} points={1} />
							<Bonhomme x={945} sol={GP} h={165 * 1.6} couleur={GRIS_CLAIR} opacite={0.85} />
						</g>
					) : null}
					<Bonhomme x={540} sol={SOL3} h={185 * K3} couleur={NOIR} pieds={ROUGE} bras={Math.min(1.05, leve)} points={f >= t.chance ? ressort(f, t.chance + 4, 220, 12) : 0} />
					<line x1={0} x2={W} y1={SOL3} y2={SOL3} stroke="#222" strokeWidth={4} />
				</svg>
				{gp > 0.01 ? <Nom x={540} y={640} texte="GRANDS-PARENTS" couleur="#555" f={f} at={t.grandsParents} /> : null}
				<Nom x={220} y={P + 16} texte="PÈRE" f={f} />
				<Nom x={860} y={P + 16} texte="MÈRE" f={f} />
				<Pastille x={540} y={1035} texte="GÈNES DE GRANDE TAILLE NON UTILISÉS" taille={28} f={f} at={t.gene} />
				<Pastille x={540} y={1125} texte="LE BON MÉLANGE" fond={ROUGE} taille={30} f={f} at={t.chance} />
			</>
		);
	} else if (scene === 4) {
		const S4 = 1490;
		const tampon = f >= t.optim ? interpolate(f - t.optim, [0, 5], [1.7, 1], {extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)}) : 0;
		const leve = ressort(f, t.optim, 120, 12);
		const yCible = S4 - 194 * K;
		contenu = (
			<>
				<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
					<Bonhomme x={150} sol={S4} h={178 * K} couleur={GRIS} />
					<Bonhomme x={540} sol={S4} h={185 * K} couleur={NOIR} pieds={ROUGE} bras={Math.min(1.05, leve)} />
					<Bonhomme x={920} sol={S4} h={168 * K} couleur={GRIS_CLAIR} />
					{f >= t.optim ? <line x1={300} x2={800} y1={yCible} y2={yCible} stroke={ROUGE} strokeWidth={3} opacity={0.45} /> : null}
					<line x1={0} x2={W} y1={S4} y2={S4} stroke="#222" strokeWidth={4} />
				</svg>
				<Pastille x={540} y={S4 - 185 * K - 90} texte={`LUI · ${v.lui} À ${v.age} ANS`} taille={28} f={f} at={t.range + 4} />
				<Pastille x={540} y={S4 - 185 * K - 165} texte={`GRANDIMI : ${v.prevue}`} fond={ROUGE} taille={30} f={f} at={t.prevue} />
				{tampon > 0 ? (
					<div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center'}}>
						<div
							style={{
								transform: `rotate(-5deg) scale(${tampon})`,
								border: `7px solid ${ROUGE}`,
								borderRadius: 10,
								padding: '6px 34px',
								fontFamily: "'Barlow Condensed', sans-serif",
								fontWeight: 800,
								fontSize: 112,
								color: ROUGE,
								background: 'rgba(255,255,255,0.75)',
							}}
						>
							{v.prevue} – {v.optim}
						</div>
					</div>
				) : null}
				<Pastille x={540} y={830} texte={`+${v.gain} AVEC LES BONNES HABITUDES`} fond={NOIR} taille={26} f={f} at={t.gain} />
				<Pastille x={540} y={900} texte="PAS FOUTU ✅" fond={ROUGE} taille={30} f={f} at={t.foutu} />
				<Nom x={150} y={S4 + 26} texte={`PÈRE ${v.pere}`} f={f} />
				<Nom x={920} y={S4 + 26} texte={`MÈRE ${v.mere}`} f={f} />
			</>
		);
	} else {
		const S5 = 1500;
		const leve = 0.85 + 0.1 * Math.sin((f - t.send) / 6);
		const commentaire = v.commentaire;
		const n = f < t.ecris ? 0 : Math.min(commentaire.length, Math.floor((f - t.ecris) / 2.2));
		contenu = (
			<>
				<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
					<Bonhomme x={540} sol={S5} h={120 * K} couleur={NOIR} pieds={ROUGE} bras={leve} />
					<line x1={0} x2={W} y1={S5} y2={S5} stroke="#222" strokeWidth={4} />
				</svg>
				<Pastille x={540} y={420} texte="ENVOIE ÇA" fond={ROUGE} taille={40} f={f} at={t.send + 2} />
				<Pastille x={540} y={505} texte="AU POTE PLUS GRAND QUE SON PÈRE" taille={26} f={f} at={t.pote} />
				{f >= t.ecris ? (
					<div
						style={{
							position: 'absolute',
							left: 90,
							right: 90,
							top: 600,
							height: 104,
							borderRadius: 18,
							border: `3px solid ${NOIR}`,
							background: '#fff',
							fontFamily: FONT,
							fontWeight: 600,
							fontSize: 38,
							color: NOIR,
							lineHeight: '98px',
							paddingLeft: 30,
							transform: `scale(${ressort(f, t.ecris, 240, 14)})`,
							boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
						}}
					>
						{commentaire.slice(0, n)}
						{Math.floor(f / 8) % 2 ? '|' : ''}
					</div>
				) : null}
				<Pastille x={540} y={760} texte="🔗 GRANDIMI.COM" fond={ROUGE} taille={34} f={f} at={t.site} />
			</>
		);
	}

	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 45%, #f5f5f5 0%, #ececec 55%, #d9d9d9 100%)', overflow: 'hidden'}}>
			{/* sol en perspective */}
			<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: 9}, (_, i) => (
					<line key={i} x1={540 + (i - 4) * 60} x2={540 + (i - 4) * 400} y1={SOL} y2={1920} stroke="#d6d6d6" strokeWidth={2} />
				))}
				{[1600, 1680, 1790].map((y) => (
					<line key={y} x1={0} x2={W} y1={y} y2={y} stroke="#dcdcdc" strokeWidth={2} />
				))}
				{scene <= 2 ? <line x1={0} x2={W} y1={SOL} y2={SOL} stroke="#222" strokeWidth={4} /> : null}
			</svg>
			<AbsoluteFill style={{transform: `scale(${pousse * entreeScene})`, transformOrigin: '50% 60%'}}>{contenu}</AbsoluteFill>
			{/* barre de progression rouge en haut */}
			<div style={{position: 'absolute', left: 0, top: 0, height: 7, width: (W * f) / fin, background: ROUGE}} />
			{/* en-tête + phrase écrite mot par mot */}
			{ph ? (
				<div style={{position: 'absolute', left: 100, right: 90, top: 222, fontFamily: FONT}}>
					<div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 25, fontWeight: 700, letterSpacing: 7, color: '#555'}}>
						<div style={{width: 13, height: 13, background: ROUGE}} />
						{ph.titre}
					</div>
					<div style={{marginTop: 16, fontSize: 54, lineHeight: 1.22, color: GRIS, fontWeight: 500}}>
						{ph.mots.map((m, i) =>
							f >= m.f ? (
								<span key={i} style={{color: m.gras ? NOIR : GRIS, fontWeight: m.gras ? 800 : 500, opacity: fondu(f, m.f, 3)}}>
									{m.w}{' '}
								</span>
							) : null,
						)}
					</div>
				</div>
			) : null}
		</AbsoluteFill>
	);
};
