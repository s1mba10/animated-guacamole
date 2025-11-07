import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { MedicationsProvider } from './src/hooks/useMedications';
import { CoursesProvider } from './src/hooks/useCourses';

const App = () => {
  return (
    <MedicationsProvider>
      <CoursesProvider>
        <AppNavigator />
      </CoursesProvider>
    </MedicationsProvider>
  );
};

export default App;
