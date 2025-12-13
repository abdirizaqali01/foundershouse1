import { useEffect, useState } from 'react'
import './TypingAnimation.css'

interface TypingAnimationProps {
  onComplete: () => void
}

export const TypingAnimation = ({ onComplete }: TypingAnimationProps) => {
  const [currentText, setCurrentText] = useState('')
  const [phase, setPhase] = useState<'typing1' | 'waiting1' | 'erasing1' | 'typing2' | 'waiting2' | 'slideOut2'>('typing1')
  
  const text1 = "Founders House: The next generation of obsessed builders"
  const text2 = "Where ambition concentrates, potential multiplies"
  
  const typingSpeed = 35
  const erasingSpeed = 20
  const waitDuration = 800
  const slideOutDuration = 800

  useEffect(() => {
    let timeout: NodeJS.Timeout

    switch (phase) {
      case 'typing1':
        if (currentText.length < text1.length) {
          timeout = setTimeout(() => {
            setCurrentText(text1.slice(0, currentText.length + 1))
          }, typingSpeed)
        } else {
          timeout = setTimeout(() => setPhase('waiting1'), waitDuration)
        }
        break

      case 'waiting1':
        timeout = setTimeout(() => setPhase('erasing1'), waitDuration)
        break

      case 'erasing1':
        if (currentText.length > 0) {
          timeout = setTimeout(() => {
            setCurrentText(currentText.slice(0, -1))
          }, erasingSpeed)
        } else {
          // After erasing, start typing text 2
          setPhase('typing2')
        }
        break

      case 'typing2':
        if (currentText.length < text2.length) {
          timeout = setTimeout(() => {
            setCurrentText(text2.slice(0, currentText.length + 1))
          }, typingSpeed)
        } else {
          timeout = setTimeout(() => setPhase('waiting2'), waitDuration)
        }
        break

      case 'waiting2':
        timeout = setTimeout(() => setPhase('slideOut2'), waitDuration)
        break

      case 'slideOut2':
        // After final slide out, complete and show map
        timeout = setTimeout(() => {
          onComplete()
        }, slideOutDuration)
        break
    }

    return () => clearTimeout(timeout)
  }, [currentText, phase])

  // Determine which animation class to apply
  const getAnimationClass = () => {
    if (phase === 'slideOut2') {
      return 'slide-out-up'
    }
    return ''
  }

  return (
    <div className={`typing-animation ${getAnimationClass()}`}>
      <div className="typing-content">
        <h1 className="typing-text">
          {currentText}
          <span className="cursor">|</span>
        </h1>
      </div>
    </div>
  )
}
