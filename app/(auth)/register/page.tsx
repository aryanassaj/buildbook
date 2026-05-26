"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = {
      companyName: (form.elements.namedItem("companyName") as HTMLInputElement).value,
      adminEmail: (form.elements.namedItem("adminEmail") as HTMLInputElement).value,
      passphrase: (form.elements.namedItem("passphrase") as HTMLInputElement).value,
      deviceName: (form.elements.namedItem("deviceName") as HTMLInputElement).value,
      fingerprint: getFingerprint(),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Registration failed");
        return;
      }

      localStorage.setItem("bb_token", json.token);
      localStorage.setItem("bb_role", json.role);
      localStorage.setItem("bb_device_id", json.deviceId);
      localStorage.setItem("bb_company_code", json.companyCode);

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8">
      <h2 className="text-white text-lg font-medium mb-1">Create your company account</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Already have a code?{" "}
        <Link href="/join" className="text-white underline underline-offset-2">
          Join existing company
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Company name" name="companyName" placeholder="YAS Networks" required />
        <Field label="Admin email" name="adminEmail" type="email" placeholder="admin@company.com" required />
        <Field
          label="Company passphrase"
          name="passphrase"
          type="password"
          placeholder="Used to verify your identity"
          required
        />
        <Field
          label="This device name"
          name="deviceName"
          placeholder="Aryan's MacBook Pro"
          required
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm text-neutral-300 block">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600"
      />
    </div>
  );
}

function getFingerprint(): string {
  const key = "bb_fingerprint";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}
