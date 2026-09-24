import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders'
import { Sparkles } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/* Bouton « métal liquide » : un shader WebGL sous une pile de calques en 3D.
   Porté depuis la version TypeScript, ce projet étant en JavaScript.

   UN SEUL ÉCART AVEC L'ORIGINAL, ET IL EST FORCÉ. L'original fige la largeur
   du mode texte à 142px, taille calculée pour « Get Started » (82px de texte).
   Le libellé d'ici, « Commencer mon analyse », en fait 180 : il sortait du
   contour arrondi de 86px, des deux côtés. La largeur se mesure donc sur le
   libellé rendu, et 142px reste le plancher — un libellé court garde
   exactement les proportions d'origine. Tout le reste est intact : le shader,
   les quatre calques, l'ondulation au clic, le mode icône.

   DEUX CHOSES À SAVOIR AVANT DE LE MULTIPLIER SUR UNE PAGE.
   1. Chaque instance monte son propre contexte WebGL, et un navigateur en
      plafonne autour de seize par page. Au-delà, les plus anciens sont
      détruits en silence et les boutons deviennent noirs.
   2. SECOND ÉCART : LE BOUTON EST ORANGE, ET LE SHADER LE COUVRE EN
      ENTIER. L'original teinte le shader en argent et pose par-dessus une
      pilule noire opaque : de l'animation, on ne voyait qu'un liseré de
      2px sur le pourtour. Ici `u_colorTint` et `u_colorBack` prennent les
      valeurs de la marque, et la pilule passe en transparent — elle ne sert
      plus qu'à porter l'enfoncement au clic.

      Le libellé suit : #17120e en demi-gras, qui est la couleur que le site
      met déjà sur ses aplats orange, et non le #666666 de l'original — ce
      gris donnait 2,84:1 sur la pilule noire, sous les 4,5:1 exigés, sur le
      bouton qui porte toute la page. */

export function LiquidMetalButton({
  label = 'Get Started',
  onClick,
  viewMode = 'text',
  type = 'button',
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState([])
  const [labelWidth, setLabelWidth] = useState(0)
  const shaderRef = useRef(null)
  const shaderMount = useRef(null)
  const buttonRef = useRef(null)
  const labelRef = useRef(null)
  const rippleId = useRef(0)

  // Mesure du libellé avant la première peinture, pour que le bouton ne
  // s'élargisse pas sous les yeux du visiteur.
  //
  // Puis une seconde fois quand les polices sont prêtes : DM Sans arrive en
  // différé, et la première mesure tombe sinon sur les métriques de la police
  // de secours. Le bouton resterait figé à la mauvaise largeur.
  useLayoutEffect(() => {
    if (viewMode !== 'text') return undefined
    const mesurer = () => {
      if (labelRef.current) setLabelWidth(Math.ceil(labelRef.current.getBoundingClientRect().width))
    }
    mesurer()
    let vivant = true
    document.fonts?.ready.then(() => {
      if (vivant) mesurer()
    })
    return () => {
      vivant = false
    }
  }, [label, viewMode])

  const dimensions = useMemo(() => {
    if (viewMode === 'icon') {
      return { width: 46, height: 46, innerWidth: 42, innerHeight: 42, shaderWidth: 46, shaderHeight: 46 }
    }
    const width = Math.max(142, labelWidth + 48)
    return {
      width,
      height: 46,
      innerWidth: width - 4,
      innerHeight: 42,
      shaderWidth: width,
      shaderHeight: 46,
    }
  }, [viewMode, labelWidth])

  useEffect(() => {
    const styleId = 'shader-canvas-style-exploded'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .shader-container-exploded {
          /* Orange plein SOUS le shader. Mesure au navigateur : laisse au
             shader le soin de peindre le fond et sa luminance balaie 0,007 a
             0,79 au fil de l animation — aucune couleur de libelle ne tient
             4,5:1 sur une telle amplitude, un voile a 82 % plafonnait encore
             a 4,38. Sur une base opaque, l animation devient un reflet qui
             passe sur toute la surface et le contraste, lui, ne bouge plus. */
          background: #ff5a1f;
        }
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
          opacity: 0.34;
          mix-blend-mode: soft-light;
        }
        @keyframes ripple-animation {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    try {
      if (shaderRef.current) {
        if (shaderMount.current?.destroy) shaderMount.current.destroy()
        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_repetition: 4,
            u_softness: 0.5,
            u_shiftRed: 0.3,
            u_shiftBlue: 0.3,
            u_distortion: 0,
            u_contour: 0,
            u_angle: 45,
            u_scale: 8,
            // La marque, pas l argent. vec4 en 0-1.
            // Le fond porte l orange plein (#ff5a1f) et la teinte porte le
            // reflet clair (#ffd2bb) : l inverse donnait un bouton brun a
            // rgb(101,31,18), mesure a la capture, ou aucun libelle ne tenait.
            u_colorBack: [1, 0.353, 0.122, 1],
            u_colorTint: [1, 0.824, 0.733, 1],
            u_shape: 1,
            u_offsetX: 0.1,
            u_offsetY: -0.1,
          },
          undefined,
          0.6
        )
      }
    } catch (error) {
      console.error('liquid-metal : le shader n a pas pu se monter', error)
    }

    return () => {
      if (shaderMount.current?.destroy) {
        shaderMount.current.destroy()
        shaderMount.current = null
      }
    }
  }, [])

  const handleMouseEnter = () => {
    setIsHovered(true)
    shaderMount.current?.setSpeed?.(1)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsPressed(false)
    shaderMount.current?.setSpeed?.(0.6)
  }

  const handleClick = (e) => {
    if (shaderMount.current?.setSpeed) {
      shaderMount.current.setSpeed(2.4)
      setTimeout(() => {
        shaderMount.current?.setSpeed?.(isHovered ? 1 : 0.6)
      }, 300)
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ }
      setRipples((prev) => [...prev, ripple])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600)
    }

    onClick?.()
  }

  const transitionPile = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease'

  return (
    <div className="relative inline-block">
      <div style={{ perspective: '1000px', perspectiveOrigin: '50% 50%' }}>
        <div
          style={{
            position: 'relative',
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transformStyle: 'preserve-3d',
            transition: transitionPile,
          }}
        >
          {/* Calque du libellé */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transformStyle: 'preserve-3d',
              transition: `${transitionPile}, gap 0.4s ease`,
              transform: 'translateZ(20px)',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            {viewMode === 'icon' && (
              <Sparkles
                size={16}
                style={{
                  color: '#17120e',
                  filter: 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.28))',
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            )}
            {viewMode === 'text' && (
              <span
                ref={labelRef}
                style={{
                  fontSize: '14px',
                  color: '#17120e',
                  fontWeight: 600,
                  textShadow: '0 1px 2px rgba(255, 255, 255, 0.28)',
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            )}
          </div>

          {/* Pilule noire */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              transformStyle: 'preserve-3d',
              transition: transitionPile,
              transform: `translateZ(10px) ${isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)'}`,
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: `${dimensions.innerWidth}px`,
                height: `${dimensions.innerHeight}px`,
                margin: '2px',
                borderRadius: '100px',
                // Transparente : elle masquait le shader et ne laissait voir de
              // l animation qu un liseré de 2px sur le pourtour. Elle ne sert
              // plus qu a porter l enfoncement au clic.
              background: 'transparent',
                boxShadow: isPressed
                  ? 'inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)'
                  : 'none',
                transition: `${transitionPile}, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
          </div>

          {/* Shader + ombres portées */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              transformStyle: 'preserve-3d',
              transition: transitionPile,
              transform: `translateZ(0px) ${isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)'}`,
              zIndex: 10,
            }}
          >
            <div
              style={{
                height: `${dimensions.height}px`,
                width: `${dimensions.width}px`,
                borderRadius: '100px',
                boxShadow: isPressed
                  ? '0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)'
                  : isHovered
                    ? '0px 0px 0px 1px rgba(0, 0, 0, 0.4), 0px 12px 6px 0px rgba(0, 0, 0, 0.05), 0px 8px 5px 0px rgba(0, 0, 0, 0.1), 0px 4px 4px 0px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.2)'
                    : '0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)',
                transition: `${transitionPile}, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
                background: 'rgb(0 0 0 / 0)',
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: '100px',
                  overflow: 'hidden',
                  position: 'relative',
                  width: `${dimensions.shaderWidth}px`,
                  maxWidth: `${dimensions.shaderWidth}px`,
                  height: `${dimensions.shaderHeight}px`,
                  transition: 'width 0.4s ease, height 0.4s ease',
                }}
              />
            </div>
          </div>

          <button
            ref={buttonRef}
            type={type}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              zIndex: 40,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(25px)',
              transition: transitionPile,
              overflow: 'hidden',
              borderRadius: '100px',
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: 'absolute',
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)',
                  pointerEvents: 'none',
                  animation: 'ripple-animation 0.6s ease-out',
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LiquidMetalButton
