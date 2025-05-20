import { createFileRoute } from '@tanstack/react-router';
import Onboarding from './index';

export const Route = createFileRoute('/onboarding')({
  component: Onboarding,
});
