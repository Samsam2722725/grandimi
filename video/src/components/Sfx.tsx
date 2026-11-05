import {createContext, useContext} from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

/** Permet de couper tous les bruitages (export des pistes séparées). */
export const SfxOn = createContext(true);
/** Dossier des bruitages (public/<dossier>/) : « sfx » d'origine, « sfx-grave » = versions graves (basses). */
export const SfxDossier = createContext('sfx');

export type SfxName = 'pop' | 'whoosh' | 'slam' | 'ding' | 'wrong' | 'crack' | 'tick' | 'sparkle' | 'papier' | 'roulement' | 'frappe' | 'bug' | 'verdict';

export const Sfx: React.FC<{at: number; name: SfxName; volume?: number}> = ({at, name, volume = 0.5}) =>
	{
	const dossier = useContext(SfxDossier);
	return useContext(SfxOn) ? (
	<Sequence from={Math.max(0, Math.round(at))} durationInFrames={40} layout="none">
		<Audio src={staticFile(`${dossier}/${name}.wav`)} volume={volume} />
	</Sequence>
	) : null;
	};
