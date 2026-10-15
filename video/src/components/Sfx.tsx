import {createContext, useContext} from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

/** Permet de couper tous les bruitages (export des pistes séparées). */
export const SfxOn = createContext(true);

export type SfxName = 'pop' | 'whoosh' | 'slam' | 'ding' | 'wrong' | 'crack' | 'tick' | 'sparkle';

export const Sfx: React.FC<{at: number; name: SfxName; volume?: number}> = ({at, name, volume = 0.5}) =>
	useContext(SfxOn) ? (
	<Sequence from={Math.max(0, Math.round(at))} durationInFrames={40} layout="none">
		<Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
	</Sequence>
	) : null;
