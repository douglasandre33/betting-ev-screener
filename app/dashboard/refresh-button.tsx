'use client';

import { useFormStatus } from 'react-dom';

type RefreshButtonProps = {
  action: () => Promise<void>;
};

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Refreshing…' : 'Refresh odds now'}
    </button>
  );
}

export function RefreshButton({ action }: RefreshButtonProps): JSX.Element {
  return (
    <form action={action}>
      <SubmitButton />
    </form>
  );
}
