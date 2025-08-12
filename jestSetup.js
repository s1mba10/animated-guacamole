import '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  return {
    runAfterInteractions: jest.fn(cb => {
      if (cb) cb();
      return { then: jest.fn() };
    }),
    createInteractionHandle: jest.fn(() => 0),
    clearInteractionHandle: jest.fn(),
  };
});
