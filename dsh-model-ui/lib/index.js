/**
 * dsh-model-ui — host half.
 *
 * Intentionally a no-op loader entry: the whole feature lives in the browser
 * half (`./client`), which dsh-client-modules picks up through the package's
 * `dsh.client` declaration.
 */

/** Host loader entry for the browser implementation exported from `./client`. */
export function apply() {}
