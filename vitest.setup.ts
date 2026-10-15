import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `globals: false` in vitest.config.ts means @testing-library/react's auto-cleanup
// hook never fires. Register it manually here so DOM state does not leak between
// tests (produces duplicate-match errors in queries otherwise).
afterEach(() => {
  cleanup();
});
