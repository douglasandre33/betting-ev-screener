'use server';

import { revalidatePath } from 'next/cache';

import { refreshOddsAndStore } from '@/lib/odds/service';

export async function refreshOddsAction(): Promise<void> {
  try {
    await refreshOddsAndStore();
  } catch (error) {
    console.error('Manual odds refresh failed:', error);
  } finally {
    revalidatePath('/dashboard');
  }
}
