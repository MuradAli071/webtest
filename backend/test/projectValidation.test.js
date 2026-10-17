import test from "node:test";
import assert from "node:assert/strict";
import { validateProjectInput } from "../src/routes/adminProjects.js";

const validProject = {
  name: "Example Project",
  summary: "A project summary based on approved content.",
  description: "Details to be supplied by the administrator.",
  category: "Website",
  technologies: ["React", "Node.js"],
  client: "",
  industry: "",
  objectives: [],
  outcomes: [],
  coverImage: null,
  images: [],
  links: { live: "", additional: [] },
  featured: false,
  published: false,
};

test("valid project content is accepted and a slug can be generated", () => {
  const result = validateProjectInput(validProject);
  assert.equal(result.error, undefined);
  assert.equal(result.value.slug, "example-project");
  assert.equal(result.value.published, false);
});

test("project image references must belong to the portfolio Cloudinary folder", () => {
  const result = validateProjectInput({
    ...validProject,
    coverImage: {
      url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      publicId: "untrusted/sample",
      alt: "Sample",
    },
  });
  assert.match(result.error, /portfolio storage folder/);
});

test("project links reject unsafe protocols and extra fields", () => {
  assert.match(
    validateProjectInput({
      ...validProject,
      links: { live: "javascript:alert(1)" },
    }).error,
    /HTTP\(S\)/,
  );
  assert.match(
    validateProjectInput({ ...validProject, outcomeMetric: "invented" }).error,
    /Unsupported project field/,
  );
});

test("projects support only bounded technology, objective and image lists", () => {
  assert.match(
    validateProjectInput({ ...validProject, technologies: Array(31).fill("Tool") }).error,
    /technologies/,
  );
  assert.match(
    validateProjectInput({ ...validProject, images: Array(13).fill({}) }).error,
    /images/,
  );
});
