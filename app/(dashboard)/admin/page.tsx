"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminDeletePoll, adminGetAllPolls } from "@/app/lib/actions/admin-actions";
import { useAuth } from "@/app/lib/context/auth-context";
import { useRouter } from "next/navigation";

interface Poll {
  id: string;
  question: string;
  user_id: string;
  created_at: string;
  options: string[];
}

// Define admin user IDs (in a real app, this would be in a database or environment variable)
const ADMIN_USER_IDS = [
  // Add actual admin user IDs here
  // For demo purposes, this list is empty - no one has admin access
];

export default function AdminPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authorized to access admin panel
    if (!user) {
      router.push('/login');
      return;
    }

    const isAdmin = ADMIN_USER_IDS.includes(user.id);
    if (!isAdmin) {
      router.push('/polls'); // Redirect to regular dashboard
      return;
    }

    setAuthorized(true);
    fetchAllPolls();
  }, [user, router]);

  const fetchAllPolls = async () => {
    if (!authorized) return;
    
    const { polls: data, error } = await adminGetAllPolls();

    if (!error && data) {
      setPolls(data);
    }
    setLoading(false);
  };

  const handleDelete = async (pollId: string) => {
    setDeleteLoading(pollId);
    const result = await adminDeletePoll(pollId);

    if (!result.error) {
      setPolls(polls.filter((poll) => poll.id !== pollId));
    } else {
      // Handle error - could show a toast notification
      console.error('Failed to delete poll:', result.error);
    }

    setDeleteLoading(null);
  };

  if (!user || !authorized) {
    return <div className="p-6">Checking authorization...</div>;
  }

  if (loading) {
    return <div className="p-6">Loading all polls...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">
          View and manage all polls in the system.
        </p>
      </div>

      <div className="grid gap-4">
        {polls.map((poll) => (
          <Card key={poll.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <CardDescription>
                    <div className="space-y-1 mt-2">
                      <div>
                        Poll ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.id}
                        </code>
                      </div>
                      <div>
                        Owner ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.user_id}
                        </code>
                      </div>
                      <div>
                        Created:{" "}
                        {new Date(poll.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(poll.id)}
                  disabled={deleteLoading === poll.id}
                >
                  {deleteLoading === poll.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Options:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {poll.options.map((option, index) => (
                    <li key={index} className="text-gray-700">
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {polls.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No polls found in the system.
        </div>
      )}
    </div>
  );
}
