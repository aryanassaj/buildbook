"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getFingerprint } from "@/lib/fingerprint";

type Stage = "form" | "pending" | "approved" | "revoked";

export default function JoinPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("form");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If this device has already been registered, send to login instead
  useEffect(() => {
    const fp = localStorage.getItem("bb_fingerprint") ?? document.cookie.match(/(?:^|;\s*)bb_fingerprint=([^;]+)/)?.[1];
    if (fp) router.replace("/login");
  }, [router]);

  // Poll for approval if pending
  useEffect(() => {
    if (stage !== "pending") return;
    const fingerprint = getFingerprint();

    const interval = setInterval(async () => {
      const res = await fetch(`/api/auth/join?fingerprint=${fingerprint}`);
      const json = await res.json();

      if (json.status === "APPROVED") {
        localStorage.setItem("bb_token", json.token);
        localStorage.setItem("bb_role", json.role);
        document.cookie = `bb_token=${json.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        setStage("approved");
        clearInterval(interval);
        setTimeout(() => router.push("/dashboard"), 1500);
      } else if (json.status === "REVOKED") {
        setStage("revoked");
        clearInterval(interval);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [stage, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = {
      companyCode: (form.elements.namedItem("companyCode") as HTMLInputElement).value.toUpperCase(),
      deviceName: (form.elements.namedItem("deviceName") as HTMLInputElement).value,
      fingerprint: getFingerprint(),
    };

    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to join");
        return;
      }

      setCompanyName(json.companyName);

      if (json.status === "APPROVED" && json.token) {
        localStorage.setItem("bb_token", json.token);
        localStorage.setItem("bb_role", json.role);
        document.cookie = `bb_token=${json.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        router.push("/dashboard");
        return;
      }

      setStage(json.status === "REVOKED" ? "revoked" : "pending");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "pending") {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-8 text-center">
        <div className="w-2 h-2 bg-yellow-400 rounded-full mx-auto mb-4 animate-pulse" />
        <h2 className="text-white text-lg font-medium mb-2">Waiting for approval</h2>
        <p className="text-neutral-400 text-sm">
          Your request to join <span className="text-white">{companyName}</span> has been sent.
          An admin needs to approve your device.
        </p>
      </div>
    );
  }

  if (stage === "approved") {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-8 text-center">
        <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mb-4" />
        <h2 className="text-white text-lg font-medium mb-2">Device approved</h2>
        <p className="text-neutral-400 text-sm">Redirecting to dashboard…</p>
      </div>
    );
  }

  if (stage === "revoked") {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-8 text-center">
        <h2 className="text-white text-lg font-medium mb-2">Access denied</h2>
        <p className="text-neutral-400 text-sm mb-4">
          Your device request was rejected. Contact your company admin.
        </p>
        <Button variant="outline" onClick={() => setStage("form")}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8">
      <h2 className="text-white text-lg font-medium mb-1">Join your company</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Already registered?{" "}
        <Link href="/login" className="text-white underline underline-offset-2">
          Sign in
        </Link>
        {" "}or{" "}
        <Link href="/register" className="text-white underline underline-offset-2">
          register a new company
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="companyCode" className="text-sm text-neutral-300 block">
            Company code
          </label>
          <input
            id="companyCode"
            name="companyCode"
            placeholder="BK-XXXXX"
            required
            className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600 uppercase tracking-widest"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deviceName" className="text-sm text-neutral-300 block">
            This device name
          </label>
          <input
            id="deviceName"
            name="deviceName"
            placeholder="Aryan's MacBook Pro"
            required
            className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Requesting access…" : "Request access"}
        </Button>
      </form>
    </div>
  );
}

