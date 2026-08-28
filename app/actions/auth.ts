"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const result = await login(formData);
  if (result.error) return { error: result.error };
  redirect("/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
