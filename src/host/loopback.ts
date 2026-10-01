/**
 * The loopback trust fence for this plugin's own control routes.
 *
 * Restarting the application is a host-surface operation, so these routes must
 * never be reachable from a LAN or tunnel origin. The check is the same one the
 * shipped host packages use: a loopback socket address AND a loopback `Host`
 * header AND browser same-origin markers. The socket address is authoritative;
 * `X-Forwarded-For` is never consulted.
 */
import type { IncomingMessage } from 'node:http'

/** IPv4 127/8 predicate (four decimal octets, first octet 127). */
function isIPv4Loopback(v4: string): boolean {
  const parts = v4.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Whether a socket remote address names the loopback range (`127/8`, `::1`, IPv4-mapped). */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (address === undefined) return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice(7))
  return isIPv4Loopback(normalized)
}

/** Whether a hostname names the loopback authority (`localhost`, `[::1]`, 127/8). */
export function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isIPv4Loopback(hostname)
}

/**
 * Request-level trust fence.
 * @param request - the incoming request.
 * @returns true only for a same-authority loopback call.
 */
export function isLoopbackRequest(request: IncomingMessage): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl: URL
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}
