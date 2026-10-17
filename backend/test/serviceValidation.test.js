import test from "node:test";
import assert from "node:assert/strict";
import { validateServiceInput } from "../src/routes/admin.js";
import { defaultServices } from "../src/services/defaultServices.js";

test("the six initial service records have valid editable content", () => {
  for (const service of defaultServices) {
    const { order: _order, ...editableService } = service;
    const result = validateServiceInput(editableService);
    assert.equal(result.error, undefined, `${service.slug}: ${result.error}`);
  }
});

test("service slugs are generated from the title when omitted", () => {
  const result = validateServiceInput({
    title: "A New Service",
    description: "A clear service description.",
    icon: "globe",
    cta: { label: "Contact us", href: "/#contact" },
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.slug, "a-new-service");
});

test("invalid slugs, icons, links, and unsupported fields are rejected", () => {
  const valid = {
    title: "A service",
    description: "A clear service description.",
    icon: "globe",
    cta: { label: "Contact us", href: "/#contact" },
  };

  assert.match(validateServiceInput({ ...valid, slug: 42 }).error, /slug/);
  assert.match(validateServiceInput({ ...valid, icon: "unknown" }).error, /icon/);
  assert.match(
    validateServiceInput({
      ...valid,
      cta: { label: "Contact", href: "javascript:alert(1)" },
    }).error,
    /CTA links/,
  );
  assert.match(validateServiceInput({ ...valid, order: 0 }).error, /Unsupported/);
});
