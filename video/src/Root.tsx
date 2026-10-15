import {Composition} from 'remotion';
import {Partie5, PARTIE5_FRAMES} from './p5/Partie5';
import {Video} from './Video';
import timeline from './timeline.json';

export const Root: React.FC = () => (
	<>
		<Composition
			id="Croissance"
			component={Video}
			durationInFrames={timeline.totalFrames}
			fps={timeline.fps}
			width={1080}
			height={1920}
		/>
		<Composition id="Partie5" component={Partie5} durationInFrames={PARTIE5_FRAMES} fps={30} width={1080} height={1920} />
	</>
);
