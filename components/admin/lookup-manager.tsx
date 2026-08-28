"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";
import { saveLookupAction, setLookupStatusAction } from "@/app/actions/admin";

const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-white/10";

export function LookupManager({
  table,
  rows,
  withDescription,
}: {
  table: "Services" | "LeadSources";
  rows: Array<Record<string, unknown>>;
  withDescription?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [pending, start] = useTransition();
  const label = table === "Services" ? "Service" : "Source";

  return (
    <div className="space-y-4">
      <form
        className="ifra-card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await saveLookupAction(table, { name, description });
            if (!result.success) toast.error(result.error);
            else {
              toast.success("Saved.");
              setName("");
              setDescription("");
              router.refresh();
            }
          });
        }}
      >
        <input className="ifra-input max-w-xs" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        {withDescription ? (
          <input className="ifra-input max-w-md" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        ) : null}
        <button className="ifra-btn-primary" disabled={pending}>
          Add
        </button>
      </form>
      <div className="ifra-card table-scroll p-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>{label}</th>
              {withDescription ? <th>Description</th> : null}
              <th>Status</th>
              <th>Lead Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.Id)}>
                <td>{String(row.Name)}</td>
                {withDescription ? <td>{String(row.Description || "—")}</td> : null}
                <td>
                  <StatusBadge value={String(row.Status)} />
                </td>
                <td>{Number(row.LeadCount || 0)}</td>
                <td>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className={`${iconBtn} text-amber-600`}
                      title="Edit"
                      aria-label="Edit"
                      onClick={() => setEditing(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {row.Status === "Active" ? (
                      <button
                        type="button"
                        className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:text-rose-400`}
                        title="Deactivate"
                        aria-label="Deactivate"
                        onClick={() =>
                          start(async () => {
                            await setLookupStatusAction(table, Number(row.Id), "Inactive");
                            router.refresh();
                          })
                        }
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400`}
                        title="Activate"
                        aria-label="Activate"
                        onClick={() =>
                          start(async () => {
                            await setLookupStatusAction(table, Number(row.Id), "Active");
                            router.refresh();
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <LookupEditModal
          label={label}
          withDescription={Boolean(withDescription)}
          pending={pending}
          initialName={String(editing.Name || "")}
          initialDescription={String(editing.Description || "")}
          onClose={() => setEditing(null)}
          onSave={(nextName, nextDescription) =>
            start(async () => {
              const result = await saveLookupAction(
                table,
                { name: nextName, description: nextDescription },
                Number(editing.Id),
              );
              if (!result.success) toast.error(result.error);
              else {
                toast.success("Updated.");
                setEditing(null);
                router.refresh();
              }
            })
          }
        />
      ) : null}
    </div>
  );
}

function LookupEditModal({
  label,
  withDescription,
  pending,
  initialName,
  initialDescription,
  onClose,
  onSave,
}: {
  label: string;
  withDescription: boolean;
  pending: boolean;
  initialName: string;
  initialDescription: string;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-xl bg-white p-5 shadow-lg dark:bg-ifra-navy sm:rounded-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave(name.trim(), description.trim());
        }}
      >
        <h2 className="text-lg font-bold text-ifra-navy dark:text-white">Edit {label}</h2>
        <label className="block">
          <span className="ifra-label">Name</span>
          <input className="ifra-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        {withDescription ? (
          <label className="block">
            <span className="ifra-label">Description</span>
            <input className="ifra-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button className="ifra-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="ifra-btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
