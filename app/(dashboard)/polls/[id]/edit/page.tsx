import { getPollById } from '@/app/lib/actions/poll-actions';
import { requirePollOwnership } from '@/lib/security';
import { notFound, redirect } from 'next/navigation';
// Import the client component
import EditPollForm from './EditPollForm';

export default async function EditPollPage({ params }: { params: { id: string } }) {
  // Check if user owns this poll
  const ownershipResult = await requirePollOwnership(params.id);
  
  if (!ownershipResult.success) {
    if (ownershipResult.error === 'Poll not found') {
      notFound();
    } else {
      redirect('/polls');
    }
  }

  const { poll, error } = await getPollById(params.id);

  if (error || !poll) {
    notFound();
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} />
    </div>
  );
}