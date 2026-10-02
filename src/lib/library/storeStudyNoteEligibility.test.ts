import { describe, expect, it } from "vitest";
import { getStoreStudyNotePath, isStorePurchasableStudyResource } from "./storeStudyNoteEligibility";

const base = {
  resource_type: "notes",
  title: "Physics — Chapter 1 — MCQs",
  grade_level: "GRADE_9",
  subjects: { name: "Physics", slug: "physics" },
  light_file_url: "r2://ilmai-storage-b2/physics/light.pdf",
  dark_file_url: null,
  drive_url: null,
};

describe("Study Notes Store eligibility", () => {
  it("accepts a printable grade 9-12 note with subject metadata", () => {
    expect(isStorePurchasableStudyResource(base)).toBe(true);
  });

  it("accepts grade 11/12 notes as college resources", () => {
    expect(isStorePurchasableStudyResource({ ...base, grade_level: "GRADE_11" })).toBe(true);
    expect(isStorePurchasableStudyResource({ ...base, grade_level: "GRADE_12" })).toBe(true);
  });

  it("rejects non-note resource types, unsupported grades, missing subject, and missing files", () => {
    expect(isStorePurchasableStudyResource({ ...base, resource_type: "text_book" })).toBe(false);
    expect(isStorePurchasableStudyResource({ ...base, grade_level: null })).toBe(false);
    expect(isStorePurchasableStudyResource({ ...base, subjects: null })).toBe(false);
    expect(isStorePurchasableStudyResource({ ...base, light_file_url: null, dark_file_url: null, drive_url: null })).toBe(false);
  });

  it("builds one deterministic encoded Store resource path", () => {
    const id = "0d2e51f8-5c47-4dd5-8a5d-1a5d6df16f0d";
    expect(getStoreStudyNotePath(id)).toBe("/store/ilm-ai-notes/resource/0d2e51f8-5c47-4dd5-8a5d-1a5d6df16f0d");
  });
});
