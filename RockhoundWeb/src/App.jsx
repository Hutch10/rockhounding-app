
import './App.css';
import { useEffect, useState } from 'react';
import { loadSpecimens, seedDemoSpecimens } from './storage/SpecimenStorage';
import { loadCustomViews, seedDemoCustomViews } from './storage/CustomViewStorage';
import { loadOnboardingState, saveOnboardingState } from './storage/OnboardingStorage';
import { demoSpecimens } from './demo/demoSpecimens';
import { demoCustomViews } from './demo/demoCustomViews';
import Router from './routes/Router';
import OnboardingTour from './components/OnboardingTour';

function App() {
  const [specimens, setSpecimens] = useState([]);
  const [customViews, setCustomViews] = useState([]);
  const [onboarding, setOnboarding] = useState({ completed: false });
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    seedDemoSpecimens(demoSpecimens);
    seedDemoCustomViews(demoCustomViews);
    setSpecimens(loadSpecimens());
    setCustomViews(loadCustomViews());
    const onboardingState = loadOnboardingState();
    setOnboarding(onboardingState);
    setShowOnboarding(!onboardingState.completed);
  }, []);

  const handleOnboardingComplete = () => {
    saveOnboardingState({ completed: true, completedAt: new Date().toISOString() });
    setOnboarding({ completed: true });
    setShowOnboarding(false);
  };

  return (
    <div className="app-root">
      {showOnboarding ? (
        <OnboardingTour steps={[]} onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />
      ) : (
        <Router
          specimens={specimens}
          setSpecimens={setSpecimens}
          customViews={customViews}
          setCustomViews={setCustomViews}
        />
      )}
    </div>
  );
}

export default App;
