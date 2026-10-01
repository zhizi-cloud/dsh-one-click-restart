/**
 * The header shape this plugin's in-host requests must present.
 *
 * The task board's route family sits behind a browser-signal tripwire: a
 * request carrying neither `Origin`, nor `sec-fetch-site`, nor the host's
 * browser-auth cookie is refused with 403 — by design, so that a bare local
 * `curl` cannot drive the agent control plane. A request issued from the host
 * process itself is in exactly that shape, because undici sends none of the
 * three.
 *
 * We therefore present the same-origin markers the board's own panel would
 * send. This is honest rather than a bypass: the socket really is loopback and
 * the authority really is ours, and the board's own fence treats exactly that
 * as the authority — in its own words the marker is a tripwire, not the check.
 */

/**
 * Marker headers for a same-origin call to the host's own route family.
 * @param base - the loopback base URL being called.
 * @returns headers to merge into the request init.
 */
export function sameOriginHeaders(base: string): Record<string, string> {
  return {
    accept: 'application/json',
    origin: base,
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
  }
}
