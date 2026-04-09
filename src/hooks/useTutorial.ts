import { useState } from 'react'

export type TutorialPage = 'landing' | 'client' | 'main'

export interface TutorialState {
  isVisible: boolean
  currentStep: number
  isFirstStep: boolean
  isLastStep: boolean
  next: () => void
  prev: () => void
  skip: () => void
  complete: () => void
  restart: () => void
}

function getKey(page: TutorialPage): string {
  return `jumanji_tutorial_${page}`
}

function isDone(page: TutorialPage): boolean {
  try {
    return localStorage.getItem(getKey(page)) === 'done'
  } catch {
    return false
  }
}

function markDone(page: TutorialPage): void {
  try {
    localStorage.setItem(getKey(page), 'done')
  } catch {
    // silent
  }
}

export function useTutorial(page: TutorialPage, totalSteps: number): TutorialState {
  const [isVisible, setIsVisible] = useState(() => !isDone(page))
  const [currentStep, setCurrentStep] = useState(0)

  const hide = () => {
    markDone(page)
    setIsVisible(false)
  }

  const next = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1)
    } else {
      hide()
    }
  }

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }

  const restart = () => {
    setCurrentStep(0)
    setIsVisible(true)
  }

  return {
    isVisible,
    currentStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    next,
    prev,
    skip: hide,
    complete: hide,
    restart,
  }
}
