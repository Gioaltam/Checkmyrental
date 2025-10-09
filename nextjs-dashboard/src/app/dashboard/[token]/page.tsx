"use client";
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function TokenDashboard() {
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    // Redirect to main dashboard with token as query param
    window.location.href = `/?token=${token}`;
  }, [token]);

  return (
    <div className="min-h-screen bg-[rgb(10,10,10)] flex items-center justify-center">
      <div className="text-white/80">Loading dashboard...</div>
    </div>
  );
}
