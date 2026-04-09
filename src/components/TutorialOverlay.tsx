import { useEffect } from 'react'
import { Button } from './ui/Button'

export interface TutorialStep {
  icon?: string
  title: string
  description: string
}

interface TutorialOverlayProps {
  steps: TutorialStep[]
  currentStep: number
  isFirstStep: boolean
  isLastStep: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

export function TutorialOverlay({
  steps,
  currentStep,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
}: TutorialOverlayProps) {
  const step = steps[currentStep]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSkip])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-jungle-950/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-sm bg-jungle-900/90 backdrop-blur-sm border border-gold-500 border-glow-gold rounded-lg p-6 flex flex-col gap-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Step content */}
        <div key={currentStep} className="flex flex-col items-center gap-3 text-center animate-fade-in">
          {step.icon && (
            <span className="text-4xl">{step.icon}</span>
          )}
          <h2 className="font-cinzel text-gold-300 text-lg font-semibold">
            {step.title}
          </h2>
          <p className="font-cinzel text-jungle-200 text-sm leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-between gap-2">
          {/* Skip */}
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-jungle-400">
            Skip
          </Button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === currentStep
                    ? 'w-2.5 h-2.5 bg-gold-400'
                    : 'w-1.5 h-1.5 bg-jungle-600'
                }`}
              />
            ))}
          </div>

          {/* Back + Next/Finish */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={onPrev}>
                ←
              </Button>
            )}
            <Button
              variant={isLastStep ? 'primary' : 'secondary'}
              size="sm"
              onClick={onNext}
            >
              {isLastStep ? 'Finish' : 'Next →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
