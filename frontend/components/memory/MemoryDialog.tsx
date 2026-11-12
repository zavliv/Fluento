"use client";

import { Brain, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type MemoryFields, type MemoryResponse } from "@/lib/api";
import { IconButton } from "../IconButton";
import { Dialog } from "../ui/Dialog";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { memoryIsEmpty, MemoryView } from "./MemoryView";

export function MemoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} label="What your teachers remember" className="max-w-xl">
      {open && <MemoryPanel onClose={onClose} />}
    </Dialog>
  );
}

function MemoryPanel({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<MemoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .memory()
      .then((res) => alive && setData(res))
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (action: () => Promise<MemoryResponse | null>, message?: string) => {
    setBusy(true);
    try {
      const next = await action();
      if (next) setData(next);
      if (message) toast({ message });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  const save = (next: MemoryFields) => void run(() => api.saveMemory(next), "Forgotten");
  const toggle = (enabled: boolean) =>
    void run(() => api.setMemoryEnabled(enabled), enabled ? "Memory turned on" : "Memory turned off");
  const clearAll = () =>
    void run(async () => {
      await api.clearMemory();
      setConfirmClear(false);
      return data ? { ...data, memory: null } : null;
    }, "Your teachers' memory was cleared");

  const empty = memoryIsEmpty(data?.memory ?? null);

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-line py-3.5 pr-3 pl-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Brain className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">What your teachers remember</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Shared by all your teachers, so they can pick up where you left off.
            </p>
          </div>
        </div>
        <IconButton label="Close" tooltip={false} onClick={onClose}>
          <X />
        </IconButton>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !data ? (
          <div className="flex justify-center py-10 text-subtle">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
        ) : !data.available ? (
          <p className="py-6 text-center text-sm text-muted">Memory is turned off for everyone right now.</p>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Let teachers remember me</p>
                <p className="text-xs text-muted">
                  {data.enabled
                    ? "They learn your goals, interests and common mistakes as you chat."
                    : "Teachers won't learn or use anything new about you."}
                </p>
              </div>
              <Switch checked={data.enabled} onChange={toggle} disabled={busy} label="Let teachers remember me" />
            </div>

            {empty || !data.memory ? (
              <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
                <p className="text-sm font-semibold text-ink">Nothing yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                  After a few messages, your teachers will start remembering what matters to you.
                </p>
              </div>
            ) : (
              <MemoryView memory={data.memory} onChange={busy ? undefined : save} />
            )}
          </>
        )}
      </div>

      {data?.available && !empty && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-xs text-subtle">Tap × on anything you want them to forget.</p>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="h-8 rounded-lg px-3 text-sm font-medium text-muted hover:bg-hover hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={busy}
                className="h-8 rounded-lg border border-danger/40 px-3 text-sm font-semibold text-danger hover:bg-danger/10"
              >
                Forget everything
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="h-8 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger/10"
            >
              Clear memory
            </button>
          )}
        </div>
      )}
    </>
  );
}
