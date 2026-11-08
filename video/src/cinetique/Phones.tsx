import React from 'react';
import {Img, staticFile} from 'remotion';

/* Écrans de l'app Grandimi (plan nutrition + exercice), dessinés en code, texte en français.
 * Repère : téléphone de 445 x 920 px, mis à l'échelle par le parent. */
const SANS = "'Plus Jakarta Sans', sans-serif";
const OR = '#ec6f25';
const FOND = '#0c0c0c';
const CARTE = '#1b1b1b';

const Cadre: React.FC<{clair?: boolean; children: React.ReactNode}> = ({clair, children}) => (
	<div style={{position: 'relative', width: 445, height: 920, borderRadius: 66, background: clair ? '#efe8dc' : '#1d1d1f', fontFamily: SANS, color: '#fff', overflow: 'hidden'}}>
		<div style={{position: 'absolute', inset: 7, borderRadius: 60, background: FOND, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 109, top: 7, width: 220, height: 34, borderRadius: 18, background: '#000'}} />
			{children}
		</div>
	</div>
);

const Engrenage: React.FC = () => (
	<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
		<circle cx={12} cy={12} r={3.2} />
		{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
			<line key={a} x1={12} y1={3} x2={12} y2={5.6} transform={`rotate(${a} 12 12)`} />
		))}
		<circle cx={12} cy={12} r={6.6} />
	</svg>
);
const Pousse = ({c}: {c: string}) => (
	<svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
		<path d="M12 21v-8M12 13c0-3-2-5-5-5 0 3 2 5 5 5zM12 13c0-3 2-5 5-5 0 3-2 5-5 5zM8 21h8M8 16h8v5H8z" />
	</svg>
);
const Pouls = ({c}: {c: string}) => (
	<svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
		<path d="M3 12h4l2.5-7 4 14 2.5-7h5" />
	</svg>
);
const Agenda = ({c}: {c: string}) => (
	<svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
		<rect x={4} y={5} width={16} height={15} rx={2.5} />
		<path d="M4 10h16M8.5 3v4M15.5 3v4" />
	</svg>
);

const Barre: React.FC<{x: number; y: number; couleur: string; val: string; label: string; plein: number}> = ({x, y, couleur, val, label, plein}) => (
	<div style={{position: 'absolute', left: x, top: y}}>
		<div style={{position: 'absolute', left: 0, top: 0, width: 8, height: 37, borderRadius: 4, background: '#333'}}>
			<div style={{position: 'absolute', left: 0, bottom: 0, width: 8, height: 37 * plein, borderRadius: 4, background: couleur}} />
		</div>
		<div style={{position: 'absolute', left: 16, top: -4, fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap'}}>{val}</div>
		<div style={{position: 'absolute', left: 16, top: 18, fontSize: 12.5, fontWeight: 600, color: '#8a8a8a', whiteSpace: 'nowrap'}}>{label}</div>
	</div>
);

const Plat: React.FC<{dir: string; top: number; h: number; img: string; titre: string; m: [string, string, string]; score: string; heure: string; deux?: boolean}> = ({dir, top, h, img, titre, m, score, heure, deux}) => {
	const o = deux ? 20 : 0;
	return (
		<div style={{position: 'absolute', left: 33, top, width: 364, height: h, borderRadius: 22, background: CARTE}}>
			<Img src={staticFile(`${dir}/images/${img}`)} style={{position: 'absolute', left: 22, top: (h - 82) / 2, width: 82, height: 82, borderRadius: 41, objectFit: 'cover'}} />
			<div style={{position: 'absolute', left: 127, top: 19, width: 225, fontSize: 15.5, fontWeight: 800, lineHeight: '20px'}}>{titre}</div>
			<Barre x={128} y={49 + o} couleur="#e5484d" val={m[0]} label="Protéines" plein={0.5} />
			<Barre x={226} y={49 + o} couleur="#f5c542" val={m[1]} label="Glucides" plein={0.55} />
			<Barre x={298} y={49 + o} couleur={OR} val={m[2]} label="Lipides" plein={0.3} />
			<div style={{position: 'absolute', left: 127, top: 105 + o, width: 138, height: 36, borderRadius: 11, background: '#2a2a2a', fontSize: 13.5, fontWeight: 800, lineHeight: '36px', textAlign: 'center'}}>{score}</div>
			<div style={{position: 'absolute', left: 275, top: 105 + o, width: 62, height: 36, borderRadius: 11, background: OR, fontSize: 14, fontWeight: 800, lineHeight: '36px', textAlign: 'center'}}>{heure}</div>
		</div>
	);
};

export const PhoneNutrition: React.FC<{dir: string}> = ({dir}) => (
	<Cadre>
		<div style={{position: 'absolute', left: 38, top: 13, fontSize: 15, fontWeight: 800}}>12:02</div>
		<div style={{position: 'absolute', left: 33, top: 100, fontSize: 31, fontWeight: 800}}>Ton plan</div>
		<div style={{position: 'absolute', left: 357, top: 94, width: 42, height: 42, borderRadius: 21, background: '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
			<Engrenage />
		</div>
		<div style={{position: 'absolute', left: 33, top: 148, width: 364, height: 42, borderRadius: 21, background: CARTE, fontSize: 16.5, fontWeight: 800, color: '#9a9a9a'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: 121, textAlign: 'center', lineHeight: '42px'}}>Physique</div>
			<div style={{position: 'absolute', left: 122, top: 0, width: 120, height: 42, borderRadius: 21, background: OR, color: '#fff', textAlign: 'center', lineHeight: '42px'}}>Nutrition</div>
			<div style={{position: 'absolute', left: 243, top: 0, width: 121, textAlign: 'center', lineHeight: '42px'}}>Bonus</div>
		</div>
		<Plat dir={dir} top={208} h={158} img="bol1.png" titre="Bol de quinoa du matin" m={['9 g', '14 g', '4 g']} score="G-Score : 9/10" heure="8 h" />
		<Plat dir={dir} top={385} h={160} img="bol2.png" titre="Salade avocat pois chiches" m={['8 g', '14 g', '7 g']} score="G-Score : 9/10" heure="13 h" />
		<Plat dir={dir} top={562} h={180} img="bol3.png" titre="Risotto champignons épinards" m={['8 g', '20 g', '6 g']} score="G-Score : 8/10" heure="19 h" deux />
		<div style={{position: 'absolute', left: 33, top: 762, width: 364, height: 70, borderRadius: 22, background: CARTE, fontSize: 13, fontWeight: 600, color: '#8a8a8a', textAlign: 'center', paddingTop: 22}}>Touche chaque carte pour voir la recette</div>
		<div style={{position: 'absolute', left: 0, top: 790, width: 431, height: 120, background: FOND, borderTop: '1px solid #1e1e1e'}}>
			<div style={{position: 'absolute', left: 52, top: 18}}><Pousse c="#8a8a8a" /></div>
			<div style={{position: 'absolute', left: 188, top: 18}}><Pouls c={OR} /></div>
			<div style={{position: 'absolute', left: 324, top: 18}}><Agenda c="#8a8a8a" /></div>
			<div style={{position: 'absolute', left: 0, top: 60, width: 144, textAlign: 'center', fontSize: 19, fontWeight: 700, color: '#8a8a8a'}}>taille</div>
			<div style={{position: 'absolute', left: 144, top: 60, width: 144, textAlign: 'center', fontSize: 19, fontWeight: 800, color: OR}}>grandir</div>
			<div style={{position: 'absolute', left: 288, top: 60, width: 143, textAlign: 'center', fontSize: 19, fontWeight: 700, color: '#8a8a8a'}}>quotidien</div>
			<div style={{position: 'absolute', left: 143, top: 102, width: 145, height: 5, borderRadius: 3, background: '#d0d0d0'}} />
		</div>
	</Cadre>
);

export const PhoneExercice: React.FC<{dir: string}> = ({dir}) => (
	<Cadre clair>
		<div style={{position: 'absolute', left: 42, top: 92, fontSize: 31, fontWeight: 800, whiteSpace: 'nowrap'}}>Flexion avant</div>
		<div style={{position: 'absolute', left: 310, top: 88, width: 42, height: 42, borderRadius: 21, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800}}>←</div>
		<div style={{position: 'absolute', left: 360, top: 88, width: 42, height: 42, borderRadius: 21, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
			<Engrenage />
		</div>
		<div style={{position: 'absolute', left: 35, top: 150, width: 359, height: 105, borderRadius: 20, background: CARTE, padding: '19px 22px', boxSizing: 'border-box', fontSize: 12.5, lineHeight: '20px', fontWeight: 500}}>
			Cet exercice étire tes <b style={{fontWeight: 800}}>ischio-jambiers et le bas du dos</b>, améliore ta souplesse et ta posture. Il décompresse la colonne et aide à gagner en taille.
		</div>
		<div style={{position: 'absolute', left: 35, top: 273, width: 172, height: 100, borderRadius: 20, background: CARTE}}>
			<div style={{position: 'absolute', left: 22, top: 22, fontSize: 13, fontWeight: 600}}>Nombre de séries</div>
			<div style={{position: 'absolute', left: 22, top: 44, fontSize: 36, fontWeight: 800}}>1x</div>
			<div style={{position: 'absolute', left: 72, top: 62, fontSize: 13, fontWeight: 700, color: '#bbb'}}>par jambe</div>
		</div>
		<div style={{position: 'absolute', left: 222, top: 273, width: 172, height: 100, borderRadius: 20, background: OR}}>
			<div style={{position: 'absolute', left: 22, top: 22, fontSize: 13, fontWeight: 600}}>Durée</div>
			<div style={{position: 'absolute', left: 22, top: 44, fontSize: 36, fontWeight: 800}}>45</div>
			<div style={{position: 'absolute', left: 77, top: 62, fontSize: 13, fontWeight: 700}}>secondes</div>
		</div>
		<Img src={staticFile(`${dir}/images/photo_etirement.png`)} style={{position: 'absolute', left: 35, top: 388, width: 359, height: 359, borderRadius: 24, objectFit: 'cover'}} />
		<div style={{position: 'absolute', left: 78, top: 777}}>
			<Pousse c="#fff" />
		</div>
		<div style={{position: 'absolute', left: 157, top: 768, width: 114, height: 52, borderRadius: 26, background: OR, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 800}}>
			<Pouls c="#fff" />
			<span>Grandir</span>
		</div>
		<div style={{position: 'absolute', left: 330, top: 777}}>
			<Agenda c="#fff" />
		</div>
	</Cadre>
);
