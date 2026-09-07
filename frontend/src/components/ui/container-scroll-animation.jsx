import { motion, useScroll, useTransform } from 'framer-motion'
import React, { useRef } from 'react'

/**
 * Le bloc bascule de ~20° vers 0° pendant qu'on scrolle : l'écran
 * « se redresse » face au lecteur. Version claire, cadre papier.
 */
export const ContainerScroll = ({ titleComponent, children }) => {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.8, 0.95] : [1.04, 1])
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div
      ref={containerRef}
      className="relative flex h-[52rem] items-center justify-center p-2 md:h-[64rem] md:p-16"
    >
      <div className="relative w-full py-8 md:py-24" style={{ perspective: '1000px' }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Cadre rotate={rotate} scale={scale}>
          {children}
        </Cadre>
      </div>
    </div>
  )
}

export const Header = ({ translate, titleComponent }) => (
  <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
    {titleComponent}
  </motion.div>
)

export const Cadre = ({ rotate, scale, children }) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      boxShadow:
        '0 0 #0000, 0 9px 20px rgba(23,18,14,0.10), 0 37px 37px rgba(23,18,14,0.07), 0 84px 50px rgba(23,18,14,0.04)',
    }}
    className="mx-auto -mt-10 h-[26rem] w-full max-w-5xl rounded-[30px] border-4 border-[color:var(--color-frost-gray)] bg-[color:var(--color-sand)] p-2 md:h-[38rem] md:p-5"
  >
    <div className="size-full overflow-hidden rounded-2xl bg-[color:var(--surface-card)] md:rounded-2xl">
      {children}
    </div>
  </motion.div>
)

export default ContainerScroll
