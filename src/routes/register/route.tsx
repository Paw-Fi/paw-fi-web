import { createFileRoute } from '@tanstack/react-router';
import Register from './index';

export const Route = createFileRoute('/register')({
  component: Register,
});
