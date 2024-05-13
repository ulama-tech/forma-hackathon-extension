import { hydrate, prerender as ssr } from "preact-iso";

import "./style.css";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";
import { useProjectInfo } from "./forma-client";
import { useRegridParcelInfo } from "./regrid-client";

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

  const parcelNumber = "055    06812";
  const parcelInfo = useRegridParcelInfo(parcelNumber);

  useEffect(() => {
    const fetchData = async () => {
      setBuildingPaths(
        await Forma.geometry.getPathsByCategory({ category: "building" })
      );
    };
    fetchData();
  }, []);

  if (parcelInfo.data) {
    const parcel = parcelInfo.data.parcels.features[0];
    const zoningId = parcel.properties.fields.zoning_id;
    const zoning =
      parcelInfo.data.zoning.features.find((z) => z.id == zoningId) ?? {};
    const {
      zoning: zoneName,
      min_front_setback_ft,
      min_rear_setback_ft,
      min_side_setback_ft,
    } = zoning.properties ?? {};

    return (
      <>
        Parcel Number: <code>{parcelNumber}</code>
        <br />
        Parcel Zoning District:
        <code>
          {zoneName} ({zoningId})
        </code>
        <br />
        Parcel Min Front Setback: {min_front_setback_ft}
        <br />
        Parcel Min Rear Setback: {min_rear_setback_ft}
        <br />
        Parcel Min Side Setback: {min_side_setback_ft}
      </>
    );
  }

  return (
    <>
      <header>
        <h3>Ulama Forma Hackathon Extension</h3>
      </header>
      <div class="section">
        <p>Total number of buildings: {buildingPaths?.length}</p>
        <br />
        Project Info:
        <br />
        <code>{JSON.stringify(projectInfo, null, 4)}</code>
        <br />
        Parcel Info:
        <br />
        <code>{JSON.stringify(parcelInfo, null, 4)}</code>
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
