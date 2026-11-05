import numpy as np,soundfile as sf,subprocess,re,sys
from scipy.signal import welch,firwin2,fftconvolve,correlate
S='/tmp/claude-0/-home-claude/e140abb8-3956-572d-b484-8a798d246504/scratchpad'
V='/home/claude/grandimi/video/public/episodes/formule-1/voice/voix.wav'
v,sr=sf.read(V);v=v if v.ndim==1 else v.mean(1)
ref,_=sf.read(f'{S}/ref_st.wav');ref=ref.mean(1)
our,_=sf.read(f'{S}/our_st.wav');our=our.mean(1)
# décalage voix -> rendu actuel
n=sr*6;c=correlate(our[:n],v[:n],mode='full',method='fft');lag=int(np.argmax(c))-(n-1);print('décalage voix dans le rendu (ms):',round(lag/sr*1000,1))
def lt(x):
    f,p=welch(x,sr,nperseg=8192);return f,p
fr,pr=lt(ref);fv,pv=lt(v)
# courbe d'égalisation lissée (1/3 octave), limitée à ±10 dB, 70 Hz – 14 kHz
cent=np.geomspace(70,14000,40);g=[]
for c0 in cent:
    m=(fr>=c0/2**(1/6))&(fr<c0*2**(1/6));g.append(10*np.log10(pr[m].sum()/pv[m].sum()))
g=np.clip(np.array(g)-np.mean(g),-10,10);g=np.where(cent<110,np.minimum(g,0),g)
print('EQ dB:',dict(zip([int(c) for c in cent[::4]],[round(x,1) for x in g[::4]])))
freqs=np.concatenate([[0],cent,[sr/2]]);gains=10**(np.concatenate([[g[0]],g,[g[-1]]])/20)
fir=firwin2(2047,freqs/(sr/2),gains,fs=None)
y=fftconvolve(v,fir)[1023:1023+len(v)]
y=np.pad(y,(0,max(0,int(17.43*sr)-len(y))))
sf.write(f'{S}/voix_eq.wav',y,sr)
