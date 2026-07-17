type WhepOptions = {
  url: string;
  token: string;
  signal: AbortSignal;
  onTrack: (stream: MediaStream) => void;
  onConnected: () => void;
};

function parseOffer(sdp: string) {
  const medias: string[] = [];
  let iceUfrag = "";
  let icePwd = "";
  for (const line of sdp.split("\r\n")) {
    if (line.startsWith("m=")) medias.push(line.slice(2));
    else if (!iceUfrag && line.startsWith("a=ice-ufrag:")) iceUfrag = line.slice(12);
    else if (!icePwd && line.startsWith("a=ice-pwd:")) icePwd = line.slice(10);
  }
  return { medias, iceUfrag, icePwd };
}

function candidateFragment(
  offer: ReturnType<typeof parseOffer>,
  candidates: RTCIceCandidate[],
) {
  const grouped = new Map<number, RTCIceCandidate[]>();
  for (const candidate of candidates) {
    const mid = candidate.sdpMLineIndex ?? 0;
    grouped.set(mid, [...(grouped.get(mid) ?? []), candidate]);
  }
  let fragment = `a=ice-ufrag:${offer.iceUfrag}\r\na=ice-pwd:${offer.icePwd}\r\n`;
  offer.medias.forEach((media, index) => {
    const list = grouped.get(index);
    if (!list?.length) return;
    fragment += `m=${media}\r\na=mid:${index}\r\n`;
    for (const candidate of list) fragment += `a=${candidate.candidate}\r\n`;
  });
  return fragment;
}

function parseIceServers(header: string | null): RTCIceServer[] {
  if (!header) return [];
  return header.split(", ").flatMap((part) => {
    const match = part.match(/^<(.+?)>; rel="ice-server"(?:; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i);
    if (!match) return [];
    return [{ urls: match[1], username: match[2], credential: match[3] }];
  });
}

export async function connectWhep(options: WhepOptions) {
  const headers = { Authorization: `Bearer ${options.token}` };
  const iceResponse = await fetch(options.url, { method: "OPTIONS", headers, signal: options.signal });
  if (!iceResponse.ok) throw new Error("WHEP_OPTIONS_FAILED");

  const peer = new RTCPeerConnection({ iceServers: parseIceServers(iceResponse.headers.get("Link")) });
  const stream = new MediaStream();
  peer.addTransceiver("video", { direction: "recvonly" });
  peer.addTransceiver("audio", { direction: "recvonly" });
  peer.ontrack = (event) => {
    stream.addTrack(event.track);
    options.onTrack(stream);
  };
  peer.onconnectionstatechange = () => {
    if (peer.connectionState === "connected") options.onConnected();
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  if (!offer.sdp) throw new Error("WHEP_SDP_MISSING");
  const offerData = parseOffer(offer.sdp);
  let sessionUrl: string | null = null;
  const queued: RTCIceCandidate[] = [];

  const sendCandidates = async (candidates: RTCIceCandidate[]) => {
    if (!sessionUrl) {
      queued.push(...candidates);
      return;
    }
    await fetch(sessionUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/trickle-ice-sdpfrag", "If-Match": "*" },
      body: candidateFragment(offerData, candidates),
      signal: options.signal,
    });
  };
  peer.onicecandidate = (event) => {
    if (event.candidate) void sendCandidates([event.candidate]);
  };

  const answer = await fetch(options.url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/sdp" },
    body: offer.sdp,
    signal: options.signal,
  });
  if (answer.status !== 201) throw new Error(`WHEP_OFFER_${answer.status}`);
  const location = answer.headers.get("Location");
  if (!location) throw new Error("WHEP_LOCATION_MISSING");
  sessionUrl = new URL(location, options.url).toString();
  await peer.setRemoteDescription({ type: "answer", sdp: await answer.text() });
  if (queued.length) await sendCandidates(queued.splice(0));

  return async () => {
    peer.close();
    if (sessionUrl) await fetch(sessionUrl, { method: "DELETE" }).catch(() => undefined);
  };
}
