'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from '@/store/slices/dashboardSlice';

interface ReduxProviderProps {
  children: React.ReactNode;
}

// Create store per component to avoid SSR hydration issues
const createStore = () => configureStore({
  reducer: {
    dashboard: dashboardReducer,
  },
});

export function ReduxProvider({ children }: ReduxProviderProps) {
  // Create store per render to avoid SSR mismatches
  const [store] = React.useState(() => createStore());
  
  return <Provider store={store}>{children}</Provider>;
}
