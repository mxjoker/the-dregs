import { createContext, useContext, useState, ReactNode } from 'react';
import { ExReviewFraming } from '@/lib/database.types';

type OnboardingContextValue = {
  userId: string;
  profileId: string;
  selectedPromptSlugs: string[];
  setSelectedPromptSlugs: (slugs: string[]) => void;
  currentPromptIndex: number;
  setCurrentPromptIndex: (index: number) => void;
  selectedFraming: ExReviewFraming | null;
  setSelectedFraming: (framing: ExReviewFraming | null) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  userId,
  profileId,
  children,
}: {
  userId: string;
  profileId: string;
  children: ReactNode;
}) {
  const [selectedPromptSlugs, setSelectedPromptSlugs] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedFraming, setSelectedFraming] = useState<ExReviewFraming | null>(null);

  return (
    <OnboardingContext.Provider
      value={{
        userId,
        profileId,
        selectedPromptSlugs,
        setSelectedPromptSlugs,
        currentPromptIndex,
        setCurrentPromptIndex,
        selectedFraming,
        setSelectedFraming,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
