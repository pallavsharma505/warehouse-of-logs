import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
} from "../api";
import type { ApiKeyCreated } from "../api";
import { useState } from "react";

function NewKeyBanner({
  newKey,
  onDismiss,
}: {
  newKey: ApiKeyCreated;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-green-800 bg-green-950/50 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-green-300">
            Key created: {newKey.name}
          </h3>
          <p className="text-xs text-green-400/70 mt-1">
            Copy this key now — it won't be shown again.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-green-400/60 hover:text-green-300 text-lg"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-900 text-green-300 px-3 py-2 rounded text-sm font-mono break-all border border-gray-800">
          {newKey.key}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-2 rounded bg-green-800 hover:bg-green-700 text-white text-sm transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function ApiKeys() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setNewKey(data);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(name.trim());
  };

  const activeKeys = keys?.filter((k) => k.status === "active") ?? [];
  const revokedKeys = keys?.filter((k) => k.status === "revoked") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">API Keys</h2>
        <p className="text-sm text-gray-400 mt-1">
          Manage authentication keys for the log collector service.
        </p>
      </div>

      {/* New key banner */}
      {newKey && (
        <NewKeyBanner newKey={newKey} onDismiss={() => setNewKey(null)} />
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          placeholder="Key name (e.g. production-backend)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={!name.trim() || createMutation.isPending}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {createMutation.isPending ? "Creating..." : "Create Key"}
        </button>
      </form>

      {createMutation.isError && (
        <p className="text-red-400 text-sm">
          {(createMutation.error as Error).message}
        </p>
      )}

      {/* Active Keys */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">
            Active Keys ({activeKeys.length})
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50 text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Key Prefix</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : activeKeys.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No active keys. Create one above.
                </td>
              </tr>
            ) : (
              activeKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-gray-200 font-medium">
                    {key.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {key.key_prefix}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                        className="px-2.5 py-1 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-800 hover:bg-yellow-800/50 text-xs transition-colors"
                      >
                        Revoke
                      </button>
                      {confirmDelete === key.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(key.id)}
                            disabled={deleteMutation.isPending}
                            className="px-2.5 py-1 rounded bg-red-800 text-red-100 text-xs hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2.5 py-1 rounded bg-gray-800 text-gray-400 text-xs hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(key.id)}
                          className="px-2.5 py-1 rounded bg-red-900/50 text-red-300 border border-red-800 hover:bg-red-800/50 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-500">
              Revoked Keys ({revokedKeys.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Key Prefix</th>
                <th className="px-4 py-2 text-left">Revoked</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {revokedKeys.map((key) => (
                <tr key={key.id} className="opacity-60 hover:opacity-80">
                  <td className="px-4 py-3 text-gray-400">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {key.key_prefix}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {key.revoked_at
                      ? new Date(key.revoked_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === key.id ? (
                      <span className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => deleteMutation.mutate(key.id)}
                          disabled={deleteMutation.isPending}
                          className="px-2.5 py-1 rounded bg-red-800 text-red-100 text-xs hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2.5 py-1 rounded bg-gray-800 text-gray-400 text-xs hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(key.id)}
                        className="px-2.5 py-1 rounded bg-red-900/50 text-red-300 border border-red-800 hover:bg-red-800/50 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
