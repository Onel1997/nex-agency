import { describe, expect, it } from "vitest";
import {
  canAccessKnowledgeCategory,
  canViewKnowledgeDocument,
  getAccessibleCategorySlugs,
} from "./knowledge-access";

describe("knowledge center category access", () => {
  it("setter sees only sales, onboarding, and sops", () => {
    const slugs = getAccessibleCategorySlugs("setter");

    expect(slugs).toEqual(["sales", "onboarding", "sops"]);
    expect(canAccessKnowledgeCategory("setter", "sales")).toBe(true);
    expect(canAccessKnowledgeCategory("setter", "vertraege")).toBe(false);
    expect(canAccessKnowledgeCategory("setter", "projekte")).toBe(false);
  });

  it("closer sees sales, onboarding, sops, and vertraege", () => {
    const slugs = getAccessibleCategorySlugs("closer");

    expect(slugs).toEqual(["sales", "onboarding", "sops", "vertraege"]);
    expect(canAccessKnowledgeCategory("closer", "vertraege")).toBe(true);
    expect(canAccessKnowledgeCategory("closer", "marketing")).toBe(false);
  });

  it("project manager sees projekte, sops, and operations", () => {
    const slugs = getAccessibleCategorySlugs("project_manager");

    expect(slugs).toEqual(["projekte", "sops", "operations"]);
    expect(canAccessKnowledgeCategory("project_manager", "projekte")).toBe(true);
    expect(canAccessKnowledgeCategory("project_manager", "sales")).toBe(false);
  });

  it("owner sees all categories", () => {
    const slugs = getAccessibleCategorySlugs("owner");

    expect(slugs).toContain("sales");
    expect(slugs).toContain("marketing");
    expect(slugs).toContain("operations");
    expect(slugs).toHaveLength(7);
  });

  it("admin sees all categories", () => {
    expect(getAccessibleCategorySlugs("admin")).toHaveLength(7);
  });
});

describe("knowledge center document visibility", () => {
  it("setter can view all and setter-specific documents", () => {
    expect(canViewKnowledgeDocument("setter", "all")).toBe(true);
    expect(canViewKnowledgeDocument("setter", "setter")).toBe(true);
    expect(canViewKnowledgeDocument("setter", "sales")).toBe(true);
    expect(canViewKnowledgeDocument("setter", "closer")).toBe(false);
    expect(canViewKnowledgeDocument("setter", "owner_admin")).toBe(false);
  });

  it("closer can view closer-specific documents", () => {
    expect(canViewKnowledgeDocument("closer", "closer")).toBe(true);
    expect(canViewKnowledgeDocument("closer", "setter")).toBe(false);
    expect(canViewKnowledgeDocument("closer", "project_manager")).toBe(false);
  });

  it("owner can view every visibility level", () => {
    expect(canViewKnowledgeDocument("owner", "all")).toBe(true);
    expect(canViewKnowledgeDocument("owner", "owner_admin")).toBe(true);
    expect(canViewKnowledgeDocument("owner", "setter")).toBe(true);
    expect(canViewKnowledgeDocument("owner", "customer_success")).toBe(true);
  });

  it("project manager can view project manager documents", () => {
    expect(canViewKnowledgeDocument("project_manager", "project_manager")).toBe(
      true,
    );
    expect(canViewKnowledgeDocument("project_manager", "sales")).toBe(false);
  });
});
