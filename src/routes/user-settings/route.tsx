import { createFileRoute } from '@tanstack/react-router';
import UserSettings from './index';

export const Route = createFileRoute('/user-settings')({
  component: UserSettings,
});
