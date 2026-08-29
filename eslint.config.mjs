import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Video asset builders for the demo reel, not application code. They are
    // CommonJS on purpose and were failing no-require-imports on every run,
    // which is how a lint suite becomes something nobody reads. The CI gate in
    // ARCHITECTURE.md G8 only means anything if a red result is a real result.
    "demo-agent/**",
    "demo-frames/**",
    "demo-simple/**",
  ]),
]);

export default eslintConfig;
