/**
 * ICE server list for PeerJS's underlying RTCPeerConnection. Google's public STUN server is
 * always included (free, no signup). TURN is optional — paste free credentials from a provider
 * like Metered.ca or OpenRelay (https://www.metered.ca/tools/openrelay/) into these env vars and
 * they're picked up automatically; leave them blank and calls simply rely on STUN + direct P2P,
 * which works for most networks but not ones behind symmetric NAT/strict firewalls.
 *
 *   NEXT_PUBLIC_TURN_URL=turn:relay.example.com:80        (comma-separate multiple URLs)
 *   NEXT_PUBLIC_TURN_USERNAME=your-turn-username
 *   NEXT_PUBLIC_TURN_CREDENTIAL=your-turn-credential
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl.split(',').map((url) => url.trim()).filter(Boolean),
      username: turnUsername,
      credential: turnCredential,
    });
  }
  return servers;
}
