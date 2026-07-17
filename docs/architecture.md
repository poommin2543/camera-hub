# Architecture and deployment notes

## Media topology

The application is the control plane; MediaMTX and FFmpeg are the media plane. Browsers never receive RTSP source URLs. Media paths use opaque camera IDs.

- LAN viewers prefer direct WHEP/WebRTC via port 8189 UDP/TCP.
- External viewers use LL-HLS through Caddy and Cloudflare Tunnel.
- Do not expose RTSP 8554, MediaMTX API 9997, metrics 9998, HLS 8888, or WHEP 8889 publicly.
- TURN is deliberately outside the MVP. Add Coturn on a public VPS when external low-latency media is required.

## Codec strategy

H.264 streams may be copied only after probing confirms a browser-safe profile. H.265 and unsafe H.264 streams are transcoded once per active camera variant and then fanned out by MediaMTX. Browser audio variants are separated: Opus for WebRTC and AAC-LC for HLS. Video-only variants contain no audio track.

Production capacity depends on resolution, FPS, bitrate, host CPU/GPU and number of H.265 cameras. Benchmark the actual Linux host before enabling all eight transcodes.

## Remaining production integration work

The checked-in controller establishes typed configuration/probe primitives and the desired reconciliation loop. Before production, validate the pinned MediaMTX image contract and connect reconciliation to atomic runtime YAML reload or the documented Control API. Add hardware-specific FFmpeg profiles after detecting VAAPI/QSV/NVENC capability.

## Cloudflare

Publish only `http://caddy:8080`. Cloudflare Access can be an outer gate, but application authentication and RBAC remain mandatory.
