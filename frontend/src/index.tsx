import { hydrate, prerender as ssr } from "preact-iso";

import "./style.css";
import logoUrl from "./assets/ulama_logo.svg";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";
import { useRegridParcelInfo } from "./regrid-client";
import { createOffsetPolygon, compareElements } from "./forma-client";
import { ParcelInfoDisplay } from "./components/parcel-info-display";

Forma.auth.configure({
  clientId: "VUAoxS8zovTVaRHHGmtk9yJaDbCgu2j8Ag7nTgmIYM3DBzj2",
  callbackUrl: "http://localhost:5173/auth.html",
  scopes: ["data:read"],
});

// TODO(maxdumas): Figure out the right way to handle routing. Currently it
// doesn't seem to work properly, probably because of being in an iframe?

export function App() {
  const [selection, setSelection] = useState<string[]>([]);
  const [generatedConstraintPath, setGeneratedConstraintPath] = useState<
    string | null
  >(null);

  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;
    (async function () {
      const res = await Forma.selection.subscribe(async ({ paths }) =>
        setSelection(paths)
      );
      unsubscribeFn = res.unsubscribe;
    })();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, []);

  const parcelNumber = "096F N 01700";
  const parcelInfo = useRegridParcelInfo("/us/tn/wilson", parcelNumber);

  if (parcelInfo.isLoading || parcelInfo.isValidating) {
    // Ignore this error, this is a valid WebComponent.
    return <weave-progress></weave-progress>;
  }

  if (parcelInfo.error) {
    return <>Encountered an error while trying to load parcel data.</>;
  }

  if (parcelInfo.data) {
    const parcel = parcelInfo.data.parcels.features[0];
    const zoningId = parcel.properties.fields.zoning_id;
    const zoning =
      parcelInfo.data.zoning.features.find((z) => z.id == zoningId) ?? {};
    const {
      zoning: zoneName,
      min_front_setback_ft: minFrontSetbackFt,
      min_rear_setback_ft: minRearSetbackFt,
      min_side_setback_ft: minSideSetbackFt,
    } = zoning.properties ?? {};

    return (
      <>
        <header
          style={{
            display: "flex",
            flexDirection: "horizontal",
            alignItems: "center",
          }}
        >
          <h2 style={{ flexGrow: 1 }}>Selected Parcel Info</h2>
          <a href="https://ulama.tech/">
            <img src={logoUrl} style={{ height: 32 }}></img>
          </a>
        </header>
        <ParcelInfoDisplay
          parcelNumber={parcelNumber}
          zoning={{
            id: zoningId,
            name: zoneName,
            minFrontSetbackFt,
            minRearSetbackFt,
            minSideSetbackFt,
          }}
        />
        <br />
        <button
          onClick={async () => {
            const res = await createOffsetPolygon(selection, -3);
            setGeneratedConstraintPath(res.path);
          }}
          style={{ display: "flex", alignItems: "center" }}
        >
          <forma-analyse-areametrics-24 slot="icon"></forma-analyse-areametrics-24>
          Generate constraints
        </button>
        {generatedConstraintPath && (
          <button
            onClick={async () => {
              if (
                !(await compareElements(generatedConstraintPath, selection))
              ) {
                alert("You have failed!");
              }
            }}
            style={{ display: "flex", alignItems: "center" }}
          >
            <forma-analyse-areametrics-24 slot="icon"></forma-analyse-areametrics-24>
            Validate against constraint
          </button>
        )}
      </>
    );
  }
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app"));
}

export async function prerender(data) {
  return await ssr(<App {...data} />);
}
