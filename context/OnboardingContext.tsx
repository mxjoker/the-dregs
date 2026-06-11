import { createContext, useContext, useState, ReactNode } from 'react';
import { ExReviewFraming } from '@/lib/app.types';

type OnboardingContextValue = {
  userId: string;
  profileId: string | null;
  setProfileId: (id: string) => void;
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
  profileId: initialProfileId,
  children,
}: {
  userId: string;
  profileId: string | null;
  children: ReactNode;
}) {
  const [profileId, setProfileId] = useState<string | null>(initialProfileId);
  const [selectedPromptSlugs, setSelectedPromptSlugs] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedFraming, setSelectedFraming] = useState<ExReviewFraming | null>(null);

  return (
    <OnboardingContext.Provider
      value={{
        userId,
        profileId,
        setProfileId,
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
