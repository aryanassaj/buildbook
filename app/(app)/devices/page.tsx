"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";

interface Device {
  id: string;
  deviceName: string;
  fingerprint: string;
  role: "ADMIN" | "MANAGER" | "ENGINEER";
  status: "PENDING" | "APPROVED" | "REVOKED";
  lastActive: string | null;
  createdAt: string;
  _count: { projects: number };
}

type Filter = "ALL" | "PENDING" | "APPROVED" | "REVOKED";

const ROLE_LABELS: Record<Device["role"], string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  ENGINEER: "Engineer",
};

const STATUS_COLORS: Record<Device["status"], string> = {
  PENDING: "text-yellow-400",
  APPROVED: "text-green-400",
  REVOKED: "text-neutral-500",
};

export default function DevicesPage() {
  const { role: myRole } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    api.get<Device[]>("/api/devices")
      .then(setDevices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function approve(deviceId: string, role: Device["role"]) {
    setActing(deviceId);
    try {
      await api.post("/api/auth/approve", { deviceId, role, action: "approve" });
      setDevices((prev) =>
        prev.map((d) => d.id === deviceId ? { ...d, status: "APPROVED", role } : d)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  }

  async function revoke(deviceId: string) {
    setActing(deviceId);
    try {
      await api.post("/api/auth/approve", { deviceId, action: "revoke" });
      setDevices((prev) =>
        prev.map((d) => d.id === deviceId ? { ...d, status: "REVOKED" } : d)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  }

  async function changeRole(deviceId: string, newRole: Device["role"]) {
    setActing(deviceId);
    try {
      await api.post("/api/auth/approve", { deviceId, role: newRole, action: "approve" });
      setDevices((prev) =>
        prev.map((d) => d.id === deviceId ? { ...d, role: newRole } : d)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  }

  const filtered = devices
    .filter((d) => filter === "ALL" || d.status === filter)
    .sort((a, b) => {
      const order = { PENDING: 0, APPROVED: 1, REVOKED: 2 };
      return order[a.status] - order[b.status];
    });

  const counts = {
    ALL: devices.length,
    PENDING: devices.filter((d) => d.status === "PENDING").length,
    APPROVED: devices.filter((d) => d.status === "APPROVED").length,
    REVOKED: devices.filter((d) => d.status === "REVOKED").length,
  };

  const canManage = myRole === "ADMIN" || myRole === "MANAGER";

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Devices</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          {loading ? "—" : `${devices.length} device${devices.length !== 1 ? "s" : ""} registered`}
        </p>
      </div>

      {/* Pending alert */}
      {!loading && counts.PENDING > 0 && (
        <div className="border border-yellow-800/50 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-300 mb-5 flex items-center gap-2">
          <span className="text-yellow-500">●</span>
          {counts.PENDING} device{counts.PENDING !== 1 ? "s" : ""} waiting for approval
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-px mb-4 border border-neutral-800 w-fit">
        {(["ALL", "PENDING", "APPROVED", "REVOKED"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 transition-colors ${
              filter === f
                ? "bg-neutral-800 text-white"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="ml-1.5 tabular-nums text-neutral-600">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-px">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-900 border border-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-neutral-800 border-dashed p-10 text-center">
          <p className="text-neutral-500 text-sm">No devices in this category.</p>
        </div>
      ) : (
        <div className="border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900">
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Device</th>
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Role</th>
                <th className="text-left text-neutral-500 font-medium px-4 py-2.5">Status</th>
                <th className="text-right text-neutral-500 font-medium px-4 py-2.5">Projects</th>
                <th className="text-right text-neutral-500 font-medium px-4 py-2.5">Last active</th>
                {canManage && (
                  <th className="text-right text-neutral-500 font-medium px-4 py-2.5">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filtered.map((d) => (
                <DeviceRow
                  key={d.id}
                  device={d}
                  canManage={canManage}
                  acting={acting === d.id}
                  onApprove={approve}
                  onRevoke={revoke}
                  onChangeRole={changeRole}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeviceRow({
  device,
  canManage,
  acting,
  onApprove,
  onRevoke,
  onChangeRole,
}: {
  device: Device;
  canManage: boolean;
  acting: boolean;
  onApprove: (id: string, role: Device["role"]) => void;
  onRevoke: (id: string) => void;
  onChangeRole: (id: string, role: Device["role"]) => void;
}) {
  const [pendingRole, setPendingRole] = useState<Device["role"]>("ENGINEER");

  return (
    <tr className="hover:bg-neutral-900/40 transition-colors">
      <td className="px-4 py-3">
        <span className="text-white font-medium">{device.deviceName}</span>
        <p className="text-neutral-600 text-xs font-mono mt-0.5">
          {device.fingerprint.slice(0, 8)}…{device.fingerprint.slice(-4)}
        </p>
      </td>

      <td className="px-4 py-3">
        {canManage && device.status === "APPROVED" ? (
          <select
            value={device.role}
            onChange={(e) => onChangeRole(device.id, e.target.value as Device["role"])}
            disabled={acting}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-2 py-1 focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          >
            <option value="ENGINEER">Engineer</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        ) : (
          <span className="text-neutral-400 text-xs">{ROLE_LABELS[device.role]}</span>
        )}
      </td>

      <td className="px-4 py-3">
        <span className={`text-xs font-medium ${STATUS_COLORS[device.status]}`}>
          {device.status.charAt(0) + device.status.slice(1).toLowerCase()}
        </span>
      </td>

      <td className="px-4 py-3 text-right text-neutral-400 tabular-nums text-xs">
        {device._count.projects}
      </td>

      <td className="px-4 py-3 text-right text-neutral-500 text-xs">
        {device.lastActive
          ? new Date(device.lastActive).toLocaleDateString()
          : "Never"}
      </td>

      {canManage && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {device.status === "PENDING" && (
              <>
                <select
                  value={pendingRole}
                  onChange={(e) => setPendingRole(e.target.value as Device["role"])}
                  disabled={acting}
                  className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-2 py-1 focus:outline-none focus:border-neutral-600 disabled:opacity-50"
                >
                  <option value="ENGINEER">Engineer</option>
                  <option value="MANAGER">Manager</option>
                </select>
                <button
                  onClick={() => onApprove(device.id, pendingRole)}
                  disabled={acting}
                  className="text-xs text-green-400 border border-green-900 px-2.5 py-1 hover:bg-green-950 transition-colors disabled:opacity-50"
                >
                  {acting ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => onRevoke(device.id)}
                  disabled={acting}
                  className="text-xs text-neutral-400 border border-neutral-800 px-2.5 py-1 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}

            {device.status === "APPROVED" && (
              <button
                onClick={() => onRevoke(device.id)}
                disabled={acting}
                className="text-xs text-red-400 border border-red-900 px-2.5 py-1 hover:bg-red-950 transition-colors disabled:opacity-50"
              >
                {acting ? "…" : "Revoke"}
              </button>
            )}

            {device.status === "REVOKED" && (
              <button
                onClick={() => onApprove(device.id, device.role)}
                disabled={acting}
                className="text-xs text-neutral-300 border border-neutral-700 px-2.5 py-1 hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {acting ? "…" : "Restore"}
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
