declare module "jest-axe" {
  interface AxeViolation {
    id: string;
    impact?: string | null;
    description?: string;
    help?: string;
    helpUrl?: string;
    nodes?: unknown[];
  }
  interface AxeResults {
    violations: AxeViolation[];
    passes: unknown[];
    incomplete: unknown[];
    inapplicable: unknown[];
  }
  export function axe(html: Element | Document | string, options?: unknown): Promise<AxeResults>;
  export const toHaveNoViolations: Record<string, unknown>;
}
