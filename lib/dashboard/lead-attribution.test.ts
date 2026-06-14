import { describe, expect, it, vi } from "vitest";
import {
  resolveLeadSetterId,
  resolveLeadSetterIdForPersistence,
} from "./lead-attribution";

function mockSupabase(profiles: Record<string, { agency_role: string; role: string }>) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((_: string, id: string) => ({
          maybeSingle: vi.fn(async () => ({
            data: profiles[id] ?? null,
          })),
        })),
      })),
    })),
  } as never;
}

const setter = {
  id: "setter-1",
  agency_role: "setter" as const,
  role: "employee" as const,
  employment_type: "employee" as const,
};

const closer = {
  id: "closer-1",
  agency_role: "closer" as const,
  role: "freelancer" as const,
  employment_type: "freelancer" as const,
};

describe("resolveLeadSetterId", () => {
  it("preserves existing setter attribution on lead updates", async () => {
    const supabase = mockSupabase({});

    await expect(
      resolveLeadSetterId(supabase, {
        actorProfile: closer,
        ownerId: "admin-1",
        existingSetterId: "setter-1",
      }),
    ).resolves.toBe("setter-1");
  });

  it("assigns setter when a setter creates a lead", async () => {
    const supabase = mockSupabase({});

    await expect(
      resolveLeadSetterId(supabase, {
        actorProfile: setter,
        ownerId: "setter-1",
      }),
    ).resolves.toBe("setter-1");
  });

  it("falls back to created_by when the creator is a setter", async () => {
    const supabase = mockSupabase({
      "setter-1": { agency_role: "setter", role: "employee" },
    });

    await expect(
      resolveLeadSetterId(supabase, {
        actorProfile: closer,
        ownerId: "admin-1",
        createdById: "setter-1",
      }),
    ).resolves.toBe("setter-1");
  });
});

describe("resolveLeadSetterIdForPersistence", () => {
  it("uses created_by when setter_id was never stored", async () => {
    const supabase = mockSupabase({
      "setter-1": { agency_role: "setter", role: "employee" },
    });

    await expect(
      resolveLeadSetterIdForPersistence(supabase, {
        setter_id: null,
        created_by: "setter-1",
        owner_id: "admin-1",
      }),
    ).resolves.toBe("setter-1");
  });

  it("keeps persisted setter_id over later owner changes", async () => {
    const supabase = mockSupabase({});

    await expect(
      resolveLeadSetterIdForPersistence(supabase, {
        setter_id: "setter-1",
        created_by: "setter-1",
        owner_id: "closer-1",
      }),
    ).resolves.toBe("setter-1");
  });
});
