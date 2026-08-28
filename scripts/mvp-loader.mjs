import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

/**
 * Next replaces `server-only` and the `@/` alias while compiling. The acceptance
 * runner imports the same server modules directly, so its loader mirrors only
 * those two resolution rules. It does not transform application code.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: 'data:text/javascript,export%20{}', shortCircuit: true }
  }

  if (specifier.startsWith('@/')) {
    return {
      url: pathToFileURL(path.join(projectRoot, 'src', specifier.slice(2))).href,
      shortCircuit: true,
    }
  }

  return nextResolve(specifier, context)
}
