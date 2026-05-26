"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFingerprint } from "@/lib/fingerprint";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fingerprint = localStorage.getItem("bb_fingerprint") ?? document.cookie.match(/(?:^|;\s*)bb_fingerprint=([^;]+)/)?.[1] ?? null;
    if (!fingerprint) {
      setError("This device has never been registered. Use Join to get access.");
      setLoading(false);
      return;
    }

    const passphrase = (e.currentTarget.elements.namedItem("passphrase") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, passphrase }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Login failed");
        return;
      }

      localStorage.setItem("bb_token", json.token);
      localStorage.setItem("bb_role", json.role);
      localStorage.setItem("bb_device_id", json.deviceId);
      localStorage.setItem("bb_company_code", json.companyCode);
      document.cookie = `bb_token=${json.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8">
      <h2 className="text-white text-lg font-medium mb-1">Sign in</h2>
      <p className="text-neutral-400 text-sm mb-6">
        New device?{" "}
        <Link href="/join" className="text-white underline underline-offset-2">
          Join with a company code
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="passphrase" className="text-sm text-neutral-300 block">
            Company passphrase
          </label>
          <input
            id="passphrase"
            name="passphrase"
            type="password"
            placeholder="Enter your company passphrase"
            required
            className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black text-sm font-medium py-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-neutral-600 text-xs mt-6">
        First time here?{" "}
        <Link href="/register" className="text-neutral-400 underline underline-offset-2">
          Register a new company
        </Link>
      </p>
    </div>
  );
}
