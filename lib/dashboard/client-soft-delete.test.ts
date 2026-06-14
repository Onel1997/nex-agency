import { describe, expect, it } from "vitest";
import {
  buildClientSoftDeleteUpdate,
  isClientActive,
  isClientSoftDeleteSchemaMissingError,
} from "./client-soft-delete";

describe("client soft delete helpers", () => {
  it("detects missing deleted_at schema errors", () => {
    expect(
      isClientSoftDeleteSchemaMissingError('column "deleted_at" does not exist'),
    ).toBe(true);
    expect(isClientSoftDeleteSchemaMissingError("permission denied")).toBe(false);
  });

  it("builds soft delete update payload", () => {
    const deletedAt = new Date("2026-06-14T12:00:00.000Z");
    expect(buildClientSoftDeleteUpdate(deletedAt)).toEqual({
      deleted_at: "2026-06-14T12:00:00.000Z",
      is_archived: true,
    });
  });

  it("treats archived or deleted clients as inactive", () => {
    expect(isClientActive({ is_archived: false, deleted_at: null })).toBe(true);
    expect(isClientActive({ is_archived: true, deleted_at: null })).toBe(false);
    expect(
      isClientActive({
        is_archived: false,
        deleted_at: "2026-06-14T12:00:00.000Z",
      }),
    ).toBe(false);
  });
});
