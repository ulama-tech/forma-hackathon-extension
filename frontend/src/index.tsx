import { hydrate, prerender as ssr } from "preact-iso";

import "./style.css";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";

Forma.auth.configure({
  clientId: "VUAoxS8zovTVaRHHGmtk9yJaDbCgu2j8Ag7nTgmIYM3DBzj2",
  callbackUrl: "http://localhost:5173/auth.html",
  scopes: ["data:read"],
});

// TODO(maxdumas): Figure out the right way to handle routing. Currently it
// doesn't seem to work properly, probably because of being in an iframe?

export function App() {
  const [buildingPaths, setBuildingPaths] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [projectInfo, setProjectInfo] = useState<object | null>(null);

  useEffect(() => {
    const authorize = async () => {
      const { accessToken } = await Forma.auth.acquireTokenOverlay();
      setAccessToken(accessToken);
    };
    authorize();
  });

  useEffect(() => {
    const getProjectInfo = async () => {
      if (!accessToken) return;

      const response = await fetch(
        `https://developer.api.autodesk.com/forma/project/v1alpha/projects/${encodeURIComponent(
          Forma.getProjectId()
        )}`,
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
            "x-ads-region": Forma.getRegion(),
            accept: "application/json",
          },
        }
      );
      if (response.ok) {
        setProjectInfo(await response.json());
      }
    };
    getProjectInfo();
  }, [accessToken]);

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
        <p>Access token: {accessToken}</p>
        <p>Total number of buildings: {buildingPaths?.length}</p>
        <code>{JSON.stringify(projectInfo || {}, null, 4)}</code>
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
