"""Ballon doré gonflé (chiffre), PNG transparent. Usage: python ballon2.py 14 sortie.png [hauteur]"""
import sys, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
text, out = sys.argv[1], sys.argv[2]
H = int(sys.argv[3]) if len(sys.argv) > 3 else 900
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
font = ImageFont.truetype(FONT, int(H * 1.0))
P = int(H * .12)
bb = font.getbbox(text, stroke_width=0)
w, h = bb[2]-bb[0]+2*P, bb[3]-bb[1]+2*P
m = Image.new("L", (w, h), 0)
d = ImageDraw.Draw(m)
d.text((P-bb[0], P-bb[1]), text, font=font, fill=255, stroke_width=int(H*.012), stroke_fill=255)
a = np.asarray(m).astype(np.float32)/255
a = cv2.GaussianBlur(a, (0,0), H*.02); a = np.clip((a-.5)*8+.5, 0, 1)
# écart entre chiffres : séparer légèrement via distance (profil indépendant)
# gonflage : équation de Poisson (-Δh = 1 dans le chiffre, h = 0 au bord) => relief lisse sans arêtes
k = 4
sm = cv2.resize((a > .5).astype(np.float32), (w//k, h//k), interpolation=cv2.INTER_AREA) > .5
hh = np.zeros(sm.shape, np.float32); mk = sm.astype(np.float32)
ker = np.array([[0,1,0],[1,0,1],[0,1,0]], np.float32)/4
for i in range(6000):
    hh = (cv2.filter2D(hh, -1, ker, borderType=cv2.BORDER_CONSTANT) + 0.25) * mk
hh = np.sqrt(np.maximum(hh, 0)); hh /= hh.max(); hh = np.minimum(hh, .75)/.75; hh = np.sin(hh*np.pi/2)
hgt = cv2.resize(hh, (w, h), interpolation=cv2.INTER_CUBIC)
hgt = cv2.GaussianBlur(hgt, (0,0), H*.008) * (a > .3)
R = H*.16
t = np.clip(hgt, 0, 1)
gy, gx = np.gradient(hgt*R)
nz = 1/np.sqrt(1+gx**2+gy**2); nx = -gx*nz; ny = -gy*nz
def ramp(v):  # v 0..1 -> or
    stops = [(0,(70,38,0)),(.25,(150,90,5)),(.5,(225,160,15)),(.75,(255,205,60)),(1,(255,245,190))]
    xs=[s[0] for s in stops]; out=np.zeros(v.shape+(3,),np.float32)
    for c in range(3): out[...,c]=np.interp(v,xs,[s[1][c] for s in stops])
    return out
# environnement : bandes horizontales + lumière haut-gauche
env = 0.42 + 0.30*np.sin(ny*7.0+1.3) + 0.30*np.sin(nx*5.0-ny*3.0+0.5)
env += 0.55*np.clip(-nx*.6-ny*.8,0,1)**1.5
spec = np.clip(-nx*.5-ny*.8+.25*nz,0,1)**40
spec2 = np.clip(nx*.5+ny*.7+.2*nz,0,1)**25
v = np.clip(env,0,1)
col = ramp(np.clip(v,0,1)) + spec[...,None]*np.array([255,250,225])*1.1 + spec2[...,None]*np.array([200,140,40])*.5
# reflet liseré intérieur + bord sombre
rim = np.clip(1-t*3.0,0,1)
col *= (1-0.55*rim[...,None]**1.5)
# fine ligne claire juste avant le bord
edge = np.exp(-((t-.13)/.03)**2)
col += edge[...,None]*np.array([90,70,20])*.8
yy=np.linspace(1,0,h,dtype=np.float32)[:,None,None]
col *= (0.82+0.22*yy)
col = np.clip(col,0,255).astype(np.uint8)
alpha = (cv2.GaussianBlur((a>.5).astype(np.float32),(0,0),1.2)*255).astype(np.uint8)
img = np.dstack([col, alpha]); im = Image.fromarray(img, "RGBA")
im = im.crop(im.getchannel("A").getbbox()); im.save(out); print(im.size)
