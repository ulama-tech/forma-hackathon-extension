import { hydrate, prerender as ssr } from "preact-iso";

import "./style.css";
import logoUrl from "./assets/ulama_logo.svg";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";
import { useRegridParcelInfo } from "./regrid-client";

Forma.auth.configure({
  clientId: "VUAoxS8zovTVaRHHGmtk9yJaDbCgu2j8Ag7nTgmIYM3DBzj2",
  callbackUrl: "http://localhost:5173/auth.html",
  scopes: ["data:read"],
});

// TODO(maxdumas): Figure out the right way to handle routing. Currently it
// doesn't seem to work properly, probably because of being in an iframe?

export function App() {
  const [selection, setSelection] = useState<string[]>([]);

  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;
    (async function () {
      const res = await Forma.selection.subscribe(({ paths }) =>
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

  const parcelNumber = "055    06812";
  const parcelInfo = useRegridParcelInfo(parcelNumber);

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
      min_front_setback_ft,
      min_rear_setback_ft,
      min_side_setback_ft,
    } = zoning.properties ?? {};

    return (
      <>
        <code>{JSON.stringify(selection, null, 4)}</code>
        <header
          style={{
            display: "flex",
            flexDirection: "horiztonal",
            alignItems: "center",
          }}
        >
          <h2 style={{ flexGrow: 1 }}>Selected Parcel Info</h2>
          <a href="https://ulama.tech/">
            <img src={logoUrl} style={{ height: 32 }}></img>
          </a>
        </header>
        <table>
          <tr>
            <th>Parcel Number</th>
            <td>
              <code>{parcelNumber}</code>
            </td>
          </tr>
          <tr>
            <th>Zoning District</th>
            <td>
              <code>
                {zoneName} ({zoningId})
              </code>
            </td>
          </tr>
          <tr>
            <th>Min Front Setback</th>
            <td>{min_front_setback_ft} ft</td>
          </tr>
          <tr>
            <th>Min Rear Setback</th>
            <td>{min_rear_setback_ft} ft</td>
          </tr>
          <tr>
            <th>Min Side Setback</th>
            <td>{min_side_setback_ft} ft</td>
          </tr>
        </table>
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