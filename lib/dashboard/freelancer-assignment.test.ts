import { describe, expect, it } from "vitest";
import type { TeamMember } from "./types";
import {
  filterAssignableFreelancers,
  isAssignableFreelancer,
} from "./freelancer-assignment";

function member(
  overrides: Partial<TeamMember> & Pick<TeamMember, "id" | "employment_type">,
): TeamMember {
  return {
    id: overrides.id,
    email: overrides.email ?? `${overrides.id}@example.com`,
    full_name: overrides.full_name ?? overrides.id,
    role: overrides.role ?? "employee",
    agency_role: overrides.agency_role ?? "setter",
    employment_type: overrides.employment_type,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
    is_active: overrides.is_active ?? true,
    status: overrides.status ?? "active",
    activated_at: overrides.activated_at ?? "2026-01-01T00:00:00.000Z",
    commission_rate: overrides.commission_rate ?? 10,
    setter_commission_rate: overrides.setter_commission_rate ?? 0,
    closer_commission_rate: overrides.closer_commission_rate ?? 10,
  };
}

describe("freelancer assignment filtering", () => {
  const owner = member({
    id: "owner-1",
    employment_type: "employee",
    agency_role: "owner",
    role: "owner",
  });
  const employee = member({
    id: "employee-1",
    employment_type: "employee",
    agency_role: "setter",
    role: "employee",
  });
  const setterEmployee = member({
    id: "setter-1",
    employment_type: "employee",
    agency_role: "setter",
    role: "setter",
  });
  const closerEmployee = member({
    id: "closer-1",
    employment_type: "employee",
    agency_role: "closer",
    role: "closer",
  });
  const freelancerSetter = member({
    id: "freelancer-setter",
    employment_type: "freelancer",
    agency_role: "setter",
    role: "setter",
  });
  const freelancerCloser = member({
    id: "freelancer-closer",
    employment_type: "freelancer",
    agency_role: "closer",
    role: "closer",
  });
  const inactiveFreelancer = member({
    id: "inactive-freelancer",
    employment_type: "freelancer",
    status: "inactive",
    activated_at: null,
  });
  const pendingFreelancer = member({
    id: "pending-freelancer",
    employment_type: "freelancer",
    status: "pending",
    activated_at: null,
  });

  it("accepts only active freelancers regardless of agency role", () => {
    expect(isAssignableFreelancer(freelancerSetter)).toBe(true);
    expect(isAssignableFreelancer(freelancerCloser)).toBe(true);
  });

  it("rejects owners, employees, and inactive freelancers", () => {
    expect(isAssignableFreelancer(owner)).toBe(false);
    expect(isAssignableFreelancer(employee)).toBe(false);
    expect(isAssignableFreelancer(setterEmployee)).toBe(false);
    expect(isAssignableFreelancer(closerEmployee)).toBe(false);
    expect(isAssignableFreelancer(inactiveFreelancer)).toBe(false);
    expect(isAssignableFreelancer(pendingFreelancer)).toBe(false);
  });

  it("filters mixed team lists down to freelancers only", () => {
    const filtered = filterAssignableFreelancers([
      owner,
      employee,
      setterEmployee,
      closerEmployee,
      freelancerSetter,
      freelancerCloser,
      inactiveFreelancer,
    ]);

    expect(filtered.map((entry) => entry.id)).toEqual([
      "freelancer-setter",
      "freelancer-closer",
    ]);
  });

  it("does not use legacy role=freelancer as a fallback", () => {
    const legacyRoleOnly = member({
      id: "legacy-role",
      employment_type: "employee",
      role: "freelancer",
      agency_role: "closer",
    });

    expect(isAssignableFreelancer(legacyRoleOnly)).toBe(false);
  });
});
