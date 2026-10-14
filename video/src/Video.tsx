import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import {Captions} from './components/Captions';
import {Cartilage, Cta, Hook, Kine, N1, N2, SceneProps, Sleep, Sport} from './Scenes';
import {C} from './theme';
import timeline from './timeline.json';
import {line, lines} from './timing';

const start = (id: string) => Math.max(0, line(id).from - 3);

const SCENES: {from: number; C: React.FC<SceneProps>}[] = [
	{from: 0, C: Hook},
	{from: start('cartilage'), C: Cartilage},
	{from: start('n1'), C: N1},
	{from: start('gh'), C: Sleep},
	{from: start('n2'), C: N2},
	{from: start('sport'), C: Sport},
	{from: start('kine'), C: Kine},
	{from: start('cta'), C: Cta},
];

export const Video: React.FC = () => {
	const total = timeline.totalFrames;
	const ctaEnd = line('plan').from + line('plan').duration + 18;
	return (
		<AbsoluteFill style={{background: C.bg}}>
			<Audio
				src={staticFile('sfx/music.wav')}
				volume={(f) => interpolate(f, [0, 10, total - 30, total], [0, 0.11, 0.11, 0], {extrapolateRight: 'clamp'})}
			/>
			{lines.map((l) => (
				<Sequence key={l.id} from={l.from} durationInFrames={l.duration + 10} layout="none">
					<Audio src={staticFile(`voice/${l.id}.wav`)} volume={1} />
				</Sequence>
			))}
			{SCENES.map((s, i) => {
				const to = i + 1 < SCENES.length ? SCENES[i + 1].from : total;
				return (
					<Sequence key={i} from={s.from} durationInFrames={to - s.from}>
						<s.C from={s.from} />
					</Sequence>
				);
			})}
			<Sequence from={0} durationInFrames={ctaEnd}>
				<Captions />
			</Sequence>
		</AbsoluteFill>
	);
};
