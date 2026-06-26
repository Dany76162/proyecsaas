import "server-only";

import { lookup } from "node:dns/promises";

/**
 * Guard anti-SSRF para el sincronizador.
 *
 * Antes de hacer fetch de cualquier URL externa (URL fuente, ficha detalle,
 * sitemap, links), validamos que:
 *  - el protocolo sea http/https (no file:, ftp:, gopher:, data:, etc.).
 *  - el host no apunte a direcciones internas/privadas/loopback/link-local
 *    (incluida la IP de metadata de cloud 169.254.169.254).
 * Para hostnames, resolvemos DNS y verificamos TODAS las IPs resueltas.
 *
 * Nota: no defiende 100% contra DNS rebinding (la IP puede cambiar entre la
 * verificación y el fetch), pero bloquea los vectores directos habituales.
 */

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // formato raro → tratar como no seguro
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reservado
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const x = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (x === "::1" || x === "::") return true; // loopback / unspecified
  if (x.startsWith("fe80")) return true; // link-local
  if (x.startsWith("fc") || x.startsWith("fd")) return true; // ULA fc00::/7
  if (x.startsWith("ff")) return true; // multicast
  if (x.startsWith("::ffff:")) {
    // IPv4-mapped (::ffff:a.b.c.d)
    const tail = x.split("::ffff:")[1] ?? "";
    if (tail.includes(".")) return isPrivateIPv4(tail);
  }
  return false;
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h.endsWith(".localhost") || h === "ip6-localhost" || h === "";
}

/**
 * ¿Es una URL pública http/https segura para fetch (anti-SSRF)?
 * Resuelve DNS para hostnames y verifica todas las IPs.
 */
export async function isPublicHttpUrl(rawUrl: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostname(host)) return false;

  if (isIpLiteral(host)) {
    return host.includes(":") ? !isPrivateIPv6(host) : !isPrivateIPv4(host);
  }

  // Hostname: resolver DNS y verificar todas las direcciones.
  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0) return false;
    for (const a of addrs) {
      const priv = a.family === 6 ? isPrivateIPv6(a.address) : isPrivateIPv4(a.address);
      if (priv) return false;
    }
    return true;
  } catch {
    return false; // no resuelve → no fetch
  }
}
