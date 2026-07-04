'use client';

import { useState } from 'react';
import {
  grantClassStaffPermissionAction,
  listClassStaffPermissionsAction,
  revokeClassStaffPermissionAction,
} from '@/app/(dashboard)/actions';
import { useAppUi } from '@/components/ui/AppUiProvider';

type StaffOption = {
  id: string;
  full_name: string;
  role: string;
};

type Props = {
  classId: string;
  instructorStaffId: string | null;
  staff: StaffOption[];
};

export default function ClassStaffAccessPanel({ classId, instructorStaffId, staff }: Props) {
  const { error: showError } = useAppUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [permissions, setPermissions] = useState<
    { staff_id: string; staff_roles?: { full_name: string; role: string } | null }[]
  >([]);

  const load = async () => {
    setLoading(true);
    const result = await listClassStaffPermissionsAction(classId);
    setLoading(false);
    if (result.ok && result.data) {
      setPermissions(result.data);
    } else if (!result.ok) {
      showError(result.error);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await load();
  };

  const availableStaff = staff.filter(
    (member) =>
      member.id !== instructorStaffId &&
      !permissions.some((permission) => permission.staff_id === member.id)
  );

  const handleGrant = async () => {
    if (!selectedStaffId) return;
    const result = await grantClassStaffPermissionAction(classId, selectedStaffId);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    setSelectedStaffId('');
    await load();
  };

  const handleRevoke = async (staffId: string) => {
    const result = await revokeClassStaffPermissionAction(classId, staffId);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await load();
  };

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void toggle()}
        className="text-white/30 hover:text-blue-400 text-xs transition"
      >
        {open ? 'Hide staff access' : 'Staff access'}
      </button>
      {open && (
        <div className="mt-2 bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
          {loading ? (
            <p className="text-white/30 text-xs">Loading…</p>
          ) : permissions.length === 0 ? (
            <p className="text-white/30 text-xs">Only the assigned instructor can manage this class.</p>
          ) : (
            <ul className="space-y-1">
              {permissions.map((permission) => (
                <li key={permission.staff_id} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">
                    {permission.staff_roles?.full_name ?? 'Staff'} ({permission.staff_roles?.role ?? 'staff'})
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(permission.staff_id)}
                    className="text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {availableStaff.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className={inputClass}
              >
                <option value="" className="bg-gray-900">
                  Add coach…
                </option>
                {availableStaff.map((member) => (
                  <option key={member.id} value={member.id} className="bg-gray-900">
                    {member.full_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleGrant()}
                disabled={!selectedStaffId}
                className="text-blue-400 hover:underline text-xs disabled:opacity-40"
              >
                Grant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
