"use client";

import { useParams, useRouter } from "next/navigation";

export default function FilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">File Detail</h1>
      </div>
      <div className="bg-white rounded-2xl shadow p-8 text-gray-400 text-sm text-center">
        Per-file function breakdown for file <span className="font-mono text-gray-600">{id}</span>
        <br className="mt-2" />
        (Drill-down view — coming soon)
      </div>
    </div>
  );
}
