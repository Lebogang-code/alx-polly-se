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
<<<<<<< HEAD
import { adminDeletePoll, adminGetAllPolls } from "@/app/lib/actions/admin-actions";
import { useAuth } from "@/app/lib/context/auth-context";
import { useRouter } from "next/navigation";
=======
import { getAllPolls, adminDeletePoll } from "@/app/lib/actions/poll-actions";
import { useAuth } from "@/app/lib/context/auth-context";
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c

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
<<<<<<< HEAD
  const [authorized, setAuthorized] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
=======
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c

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
<<<<<<< HEAD
    if (!authorized) return;
    
    const { polls: data, error } = await adminGetAllPolls();

    if (!error && data) {
      setPolls(data);
=======
    setLoading(true);
    setError(null);
    
    const result = await getAllPolls();
    
    if (result.error) {
      setError(result.error);
    } else {
      setPolls(result.polls);
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c
    }
    setLoading(false);
  };

  const handleDelete = async (pollId: string) => {
    setDeleteLoading(pollId);
    const result = await adminDeletePoll(pollId);

    if (!result.error) {
      setPolls(polls.filter((poll) => poll.id !== pollId));
    } else {
<<<<<<< HEAD
      // Handle error - could show a toast notification
      console.error('Failed to delete poll:', result.error);
=======
      setError(result.error);
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c
    }

    setDeleteLoading(null);
  };

<<<<<<< HEAD
  if (!user || !authorized) {
    return <div className="p-6">Checking authorization...</div>;
  }
=======
  // Check if user is admin
  const isAdmin = user && process.env.NEXT_PUBLIC_ADMIN_EMAIL?.split(',').includes(user.email);
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c

  if (loading) {
    return <div className="p-6">Loading all polls...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            You do not have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">
          View and manage all polls in the system.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
