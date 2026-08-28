"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badges";
import { createUserAction, resetPasswordAction, setUserStatusAction, updateUserAction } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/utils";
import { roleLabel as prettyRole } from "@/lib/permissions";

export function UsersManager({
  users,
}: {
  users: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <button className="ifra-btn-primary mb-4" onClick={() => { setEditing(null); setOpen(true); }}>
        Add User
      </button>
      <div className="ifra-card table-scroll p-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.Id)}>
                <td>{String(u.Name)}</td>
                <td>{String(u.Username)}</td>
                <td>{String(u.Email)}</td>
                <td>{String(u.Phone || "—")}</td>
                <td>{prettyRole(u.Role as "ADMIN" | "SALES_MANAGER" | "SALES_EMPLOYEE")}</td>
                <td>
                  <StatusBadge value={String(u.Status)} />
                </td>
                <td>{formatDateTime(u.LastLogin as string)}</td>
                <td>{formatDateTime(u.CreatedAt as string)}</td>
                <td className="space-x-2">
                  <button onClick={() => { setEditing(u); setOpen(true); }}>Edit</button>
                  <button
                    onClick={() =>
                      start(async () => {
                        await setUserStatusAction(Number(u.Id), u.Status === "Active" ? "Inactive" : "Active");
                        router.refresh();
                      })
                    }
                  >
                    {u.Status === "Active" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() =>
                      start(async () => {
                        const password = window.prompt("New password (min 8 characters)");
                        if (!password) return;
                        const result = await resetPasswordAction(Number(u.Id), password);
                        if (!result.success) toast.error(result.error);
                        else toast.success("Password reset.");
                      })
                    }
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <UserModal
          pending={pending}
          editing={editing}
          onClose={() => setOpen(false)}
          onSave={(data) =>
            start(async () => {
              const result = editing
                ? await updateUserAction(Number(editing.Id), data)
                : await createUserAction(data);
              if (!result.success) toast.error(result.error);
              else {
                toast.success("User updated.");
                setOpen(false);
                router.refresh();
              }
            })
          }
        />
      ) : null}
    </div>
  );
}

function UserModal({
  editing,
  pending,
  onClose,
  onSave,
}: {
  editing: Record<string, unknown> | null;
  pending: boolean;
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
}) {
  const [data, setData] = useState({
    name: String(editing?.Name || ""),
    username: String(editing?.Username || ""),
    email: String(editing?.Email || ""),
    phone: String(editing?.Phone || ""),
    role: String(editing?.Role || "SALES_EMPLOYEE"),
    password: "",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-xl bg-white p-5 dark:bg-ifra-navy sm:rounded-xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(data);
        }}
      >
        <h2 className="text-lg font-bold">{editing ? "Edit User" : "Add User"}</h2>
        {["name", "username", "email", "phone"].map((key) => (
          <label key={key} className="block">
            <span className="ifra-label">{key}</span>
            <input className="ifra-input" value={data[key as keyof typeof data]} onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))} />
          </label>
        ))}
        <label className="block">
          <span className="ifra-label">Role</span>
          <select className="ifra-input" value={data.role} onChange={(e) => setData((d) => ({ ...d, role: e.target.value }))}>
            <option value="ADMIN">Administrator</option>
            <option value="SALES_EMPLOYEE">User</option>
          </select>
        </label>
        {!editing ? (
          <label className="block">
            <span className="ifra-label">Password</span>
            <input className="ifra-input" type="password" value={data.password} onChange={(e) => setData((d) => ({ ...d, password: e.target.value }))} />
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
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
