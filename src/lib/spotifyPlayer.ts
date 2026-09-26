// Shared hidden Spotify player using the official Spotify iFrame API.
type Controller = {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  addListener: (ev: string, cb: (e: any) => void) => void;
};

let controllerPromise: Promise<Controller> | null = null;
let currentUri: string | null = null;
const listeners = new Set<(uri: string | null, paused: boolean) => void>();

function getController(): Promise<Controller> {
  if (controllerPromise) return controllerPromise;
  controllerPromise = new Promise((resolve) => {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;bottom:0;opacity:0;pointer-events:none;";
    const el = document.createElement("div");
    host.appendChild(el);
    document.body.appendChild(host);
    (window as any).onSpotifyIframeApiReady = (api: any) => {
      api.createController(el, { width: 300, height: 80 }, (c: Controller) => {
        c.addListener("playback_update", (e: any) => {
          listeners.forEach((l) => l(currentUri, !!e?.data?.isPaused));
        });
        resolve(c);
      });
    };
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    document.body.appendChild(s);
  });
  return controllerPromise;
}

export async function toggleSpotifyTrack(trackId: string, isPlaying: boolean) {
  const c = await getController();
  const uri = `spotify:track:${trackId}`;
  if (currentUri === uri) {
    if (isPlaying) c.pause(); else c.play();
    return;
  }
  currentUri = uri;
  listeners.forEach((l) => l(uri, false));
  c.loadUri(uri);
  // play once loaded
  const onReady = () => c.play();
  c.addListener("ready", onReady);
  setTimeout(() => c.play(), 600);
}

export function subscribeSpotify(cb: (uri: string | null, paused: boolean) => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function preloadSpotify() { void getController(); }
