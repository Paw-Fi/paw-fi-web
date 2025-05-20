import { createFileRoute } from '@tanstack/react-router';
import Profile from './index';

export const Route = createFileRoute('/profile')({
  component: Profile,
});
