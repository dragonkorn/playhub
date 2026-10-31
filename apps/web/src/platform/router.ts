import { useEffect, useState } from "react";

export type Route = { page: "home" } | { page: "join"; code: string } | { page: "room"; code: string };

function parse(path: string): Route {
  const join = path.match(/^\/join(?:\/([^/]*))?$/);
  if (join) return { page: "join", code: (join[1] ?? "").toUpperCase() };
  const room = path.match(/^\/room\/([^/]+)$/);
  if (room) return { page: "room", code: (room[1] as string).toUpperCase() };
  return { page: "home" };
}

export function navigate(path: string) {
  history.pushState(null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.pathname));
  useEffect(() => {
    const update = () => setRoute(parse(location.pathname));
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  return route;
}
