import { useLayoutEffect, useEffect } from 'react';

/**
 * A hook that uses useLayoutEffect on the client and useEffect on the server
 * This avoids warnings when using useLayoutEffect in SSR
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' 
  ? useLayoutEffect 
  : useEffect;
