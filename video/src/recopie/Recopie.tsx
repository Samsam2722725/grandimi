import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, cancelRender, continueRender, delayRender, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';

/*
 * Recopie d'une vidéo de référence : la « plaque » (l'original sans ses sous-titres, scripts/plaque.py)
 * + les sous-titres reconstruits image par image d'après les mesures (scripts/inventaire_soustitres.py
 * puis scripts/recopie.py) + la fin remplacée par Grandimi.
 * Une recopie = public/recopies/<id>/ (config.json → recopie.json).
 * npx remotion render Recopie out/x.mp4 --props='{"video":"grandir-dos"}'
 */

type Groupe = {texte: string; de: number; a: number; cx: number; haut: number; bas: number; images: [number, number, number][]};
type Cta = {
	carte: {de: number; x0: number; y0: number; x1: number; y1: number};
	ecran: {allume: number; fondu: number; logo: number; x0: number; y0: number; x1: number; y1: number};
	titre: string;
	sous_titre: string;
	icone: string;
	infos: [string, string, string][];
};
type Police = {taille: number; interlettrage: number; ligne_base: number; graisse?: number; contour?: number; ombre?: number; rayon?: number};
type Donnees = {
	fps: number;
	largeur_ref: number;
	totalFrames: number;
	plaque: string;
	audio: string;
	police: Police;
	rose: string;
	groupes: Groupe[];
	cta: Cta;
};

export type RecopieProps = {video: string; donnees?: Donnees; audio?: boolean; reglages?: Partial<Police>};

export const calculateRecopieMetadata: CalculateMetadataFunction<RecopieProps> = async ({props}) => {
	const donnees: Donnees = await fetch(staticFile(`recopies/${props.video}/recopie.json`)).then((r) => r.json());
	return {durationInFrames: donnees.totalFrames, fps: donnees.fps, props: {...props, donnees}};
};

const POLICE = "'Barlow Condensed', sans-serif";
const SYSTEME = "-apple-system, 'SF Pro Display', 'Inter', 'Helvetica Neue', Arial, sans-serif";

const usePolice = () => {
	const [handle] = useState(() => delayRender('Police Barlow Condensed'));
	useEffect(() => {
		const polices = ['700', '800'].map((w) => new FontFace('Barlow Condensed', `url(${staticFile(`fonts/barlow-condensed-latin-${w}-normal.woff2`)})`, {weight: w}));
		Promise.all(polices.map((f) => f.load()))
			.then((l) => {
				l.forEach((x) => document.fonts.add(x));
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
};

/* Ligne de sous-titre façon CapCut : capitales blanches, contour noir, mot prononcé sur un rectangle rose. */
const Ligne: React.FC<{g: Groupe; d: Donnees; p: Police; f: number; K: number}> = ({g, d, p, f, K}) => {
	const [, mot, opacite] = g.images[f - g.de] ?? [f, -1, 0];
	const {taille, interlettrage, ligne_base, graisse = 700, contour = 2.4, ombre = 3, rayon = 7} = p;
	const fs = taille * K;
	const H = (g.bas - g.haut) * K;
	const base = (ligne_base - g.haut) * K; // ligne de base depuis le haut du rectangle
	const demiEspace = (taille * 0.2 + interlettrage) * K * 0.5;
	return (
		<div
			style={{
				position: 'absolute',
				top: g.haut * K,
				left: g.cx * K,
				transform: 'translateX(-50%)',
				display: 'flex',
				whiteSpace: 'nowrap',
			}}
		>
			{g.texte.split(' ').map((m, i) => (
				<div key={i} style={{position: 'relative', height: H, padding: `0 ${demiEspace}px`}}>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: rayon * K,
							background: d.rose,
							opacity: i === mot ? opacite : 0,
						}}
					/>
					<div
						style={{
							position: 'relative',
							top: base - 0.9 * fs,
							fontFamily: POLICE,
							fontWeight: graisse,
							fontSize: fs,
							lineHeight: 1,
							letterSpacing: interlettrage * K,
							color: '#fff',
							WebkitTextStroke: `${contour * K * 2}px #000`,
							paintOrder: 'stroke fill',
							textShadow: `0 0 ${ombre * K}px rgba(0,0,0,0.55)`,
						}}
					>
						{m}
					</div>
				</div>
			))}
		</div>
	);
};

/* Fiche façon magasin d'applications, aux mêmes place et taille que celle de l'original. */
const Carte: React.FC<{c: Cta; K: number}> = ({c, K}) => {
	const {x0, y0, x1, y1} = c.carte;
	const px = (v: number) => v * K;
	const bleu = '#2f86f6';
	return (
		<div style={{position: 'absolute', left: px(x0), top: px(y0), width: px(x1 - x0), height: px(y1 - y0), background: '#000', overflow: 'hidden', fontFamily: SYSTEME}}>
			<div style={{position: 'absolute', left: px(14), top: px(7), color: bleu, fontSize: px(19.5), display: 'flex', alignItems: 'center', gap: px(6)}}>
				<svg style={{width: px(12), height: px(20)}} viewBox="0 0 12 20" fill="none" stroke={bleu} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
					<path d="M10 2 2 10l8 8" />
				</svg>
				Recherche
			</div>
			<Img src={staticFile(c.icone)} style={{position: 'absolute', left: px(25), top: px(47), width: px(141), height: px(141), borderRadius: px(30)}} />
			<div style={{position: 'absolute', left: px(185), top: px(50), width: px(300), color: '#fff', fontSize: px(25), fontWeight: 600, lineHeight: 1.17}}>{c.titre}</div>
			<div style={{position: 'absolute', left: px(185), top: px(115), color: '#a1a1a6', fontSize: px(16.5)}}>{c.sous_titre}</div>
			<div style={{position: 'absolute', left: px(185), top: px(154), width: px(88), height: px(34), borderRadius: px(17), background: bleu, color: '#fff', fontSize: px(17.5), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
				Ouvrir
			</div>
			<svg style={{position: 'absolute', left: px(468), top: px(156), width: px(24), height: px(30)}} viewBox="0 0 24 30" fill="none" stroke={bleu} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
				<path d="M12 2v16M6 8l6-6 6 6M5 13H3v15h18V13h-2" />
			</svg>
			<div style={{position: 'absolute', left: px(14), right: 0, top: px(212), height: 1, background: '#2c2c2e'}} />
			{c.infos.map(([titre, valeur, bas], i) => {
				const cx = [82, 212, 340, 485][i];
				return (
					<div key={i} style={{position: 'absolute', left: px(cx - 62), width: px(124), top: px(230), textAlign: 'center', color: '#8e8e93'}}>
						<div style={{fontSize: px(11.5), fontWeight: 600, letterSpacing: px(0.4)}}>{titre}</div>
						<div style={{marginTop: px(8), height: px(30), fontSize: px(24), fontWeight: 500, color: '#a1a1a6', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
							{valeur === 'icone' ? <Img src={staticFile(c.icone)} style={{width: px(26), height: px(26), borderRadius: px(6), filter: 'grayscale(1) brightness(0.75)'}} /> : valeur}
						</div>
						<div style={{marginTop: px(3), fontSize: px(13.5)}}>{bas}</div>
						{i > 0 && <div style={{position: 'absolute', left: 0, top: px(8), width: 1, height: px(56), background: '#2c2c2e'}} />}
					</div>
				);
			})}
		</div>
	);
};

/* Écran du téléphone : opaque (cache celui de l'original), passe du noir au blanc cassé (rampe mesurée),
   logo et nom visibles dès l'allumage comme dans l'original. */
const Ecran: React.FC<{c: Cta; f: number; K: number}> = ({c, f, K}) => {
	const e = c.ecran;
	const px = (v: number) => v * K;
	const lum = interpolate(f, [e.allume, e.allume + e.fondu - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div
			style={{
				position: 'absolute',
				left: px(e.x0),
				top: px(e.y0),
				width: px(e.x1 - e.x0),
				height: px(e.y1 - e.y0),
				borderRadius: `0 0 ${px(30)}px ${px(30)}px`,
				background: '#000',
				overflow: 'hidden',
				fontFamily: SYSTEME,
			}}
		>
			<div style={{position: 'absolute', inset: 0, background: '#faf8f2', opacity: lum}}>
				<Img src={staticFile(c.icone)} style={{position: 'absolute', left: '50%', top: px(10), width: px(50), height: px(50), marginLeft: px(-25), borderRadius: px(11)}} />
				{f >= e.logo && <div style={{position: 'absolute', width: '100%', top: px(68), textAlign: 'center', fontSize: px(16), fontWeight: 600, color: '#1d1d1f'}}>Grandimi</div>}
			</div>
		</div>
	);
};

export const Recopie: React.FC<RecopieProps> = ({donnees: d, audio = true, reglages}) => {
	usePolice();
	const f = useCurrentFrame();
	if (!d) return null;
	const K = 1080 / d.largeur_ref;
	const g = d.groupes.find((x) => f >= x.de && f <= x.a);
	return (
		<AbsoluteFill style={{background: '#fff'}}>
			<OffthreadVideo src={staticFile(d.plaque)} muted style={{width: 1080, height: 1920}} />
			{f >= d.cta.ecran.allume && <Ecran c={d.cta} f={f} K={K} />}
			{f >= d.cta.carte.de && <Carte c={d.cta} K={K} />}
			{g && <Ligne g={g} d={d} p={{...d.police, ...reglages}} f={f} K={K} />}
			{audio && <Audio src={staticFile(d.audio)} />}
		</AbsoluteFill>
	);
};
