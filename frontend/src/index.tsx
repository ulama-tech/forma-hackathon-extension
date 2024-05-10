import {
  LocationProvider,
  Router,
  Route,
  hydrate,
  prerender as ssr,
} from "preact-iso";

// import { Header } from "./components/Header.jsx";
// import { Home } from "./pages/Home/index.jsx";
// import { NotFound } from "./pages/_404.jsx";
import "./style.css";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";

// TODO(maxdumas): Figure out the right way to handle routing. Currently it
// doesn't seem to work properly, probably because of being in an iframe?

export function App() {
  const [buildingPaths, setBuildingPaths] = useState<string[]>([]);

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
