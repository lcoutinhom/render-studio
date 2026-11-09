import type { PageProps } from '@inertiajs/core';
export type User = { id: number; name: string; email: string; unconfirmed_email: string | null; confirmed_at: string | null };
export interface SharedProps extends PageProps {
  auth: { user: User | null };
  flash: { notice?: string; alert?: string };
  csrf_token: string;
}
