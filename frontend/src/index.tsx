import { hydrate, prerender as ssr } from "preact-iso";

import "./style.css";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";
import { useProjectInfo } from "./forma-client";

Forma.auth.configure({
  clientId: "VUAoxS8zovTVaRHHGmtk9yJaDbCgu2j8Ag7nTgmIYM3DBzj2",
  callbackUrl: "http://localhost:5173/auth.html",
  scopes: ["data:read"],
});

// TODO(maxdumas): Figure out the right way to handle routing. Currently it
// doesn't seem to work properly, probably because of being in an iframe?

export function App() {
  const [buildingPaths, setBuildingPaths] = useState<string[]>([]);

  const projectInfo = useProjectInfo();

  useEffect(() => {
    const fetchData = async () => {
      setBuildingPaths(
        await Forma.geometry.getPathsByCategory({ category: "building" })
      );
    };
    fetchData();
  }, []);

  return (
    <>
      <header>
        <h3>Ulama Forma Hackathon Extension</h3>
      </header>
      <div class="section">
        <p>Total number of buildings: {buildingPaths?.length}</p>
        <code>{JSON.stringify(projectInfo, null, 4)}</code>
      </div>
    </>
  );
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app"));
}

export async function prerender(data) {
  return await ssr(<App {...data} />);
}
