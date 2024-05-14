import { hydrate } from "preact-iso";

import "./style.css";
import logoUrl from "./assets/ulama_logo.svg";
import { Forma } from "forma-embedded-view-sdk/auto";
import { useState, useEffect } from "preact/hooks";
import { useRegridParcelInfo } from "./regrid-client";
import { createOffsetPolygon, elementsSatisfyConstraint } from "./forma-client";
import {
  ParcelInfoDisplay,
  type Zoninginfo,
} from "./components/parcel-info-display";

Forma.auth.configure({
  clientId: "VUAoxS8zovTVaRHHGmtk9yJaDbCgu2j8Ag7nTgmIYM3DBzj2",
  callbackUrl: "https://forma-hackathon-extension.vercel.app/auth.html",
  scopes: ["data:read"],
});

// TODO(maxdumas): Figure out the right way to handle routing. Currently it
// doesn't seem to work properly, probably because of being in an iframe?

type State<T> =
  | {
      status: "NOT_STARTED";
    }
  | { status: "PROCESSING" }
  | { status: "FAILED"; error: string }
  | { status: "SUCCESS"; value: T };

export function App() {
  const [selection, setSelection] = useState<string[]>([]);
  const [parcelNumber, setParcelNumber] = useState<string | null>(null);
  const [constraintGenerationState, setConstraintGenerationState] = useState<
    State<string>
  >({ status: "NOT_STARTED" });

  const [complianceState, setComplianceState] = useState<State<boolean>>({
    status: "NOT_STARTED",
  });

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

  const handleGenerateConstraint = async (zoningInfo: Zoninginfo) => {
    setConstraintGenerationState({ status: "PROCESSING" });

    try {
      const res = await createOffsetPolygon(
        selection,
        zoningInfo.minFrontSetbackFt
      );
      setConstraintGenerationState({ status: "SUCCESS", value: res.path });
    } catch (error) {
      setConstraintGenerationState({ status: "FAILED", error: error.message });
    }
  };

  const handleCheckElementSatisfiesConstraint = async () => {
    if (constraintGenerationState.status != "SUCCESS") {
      return;
    }

    setComplianceState({ status: "PROCESSING" });

    try {
      const complianceResult = await elementsSatisfyConstraint(
        constraintGenerationState.value,
        selection
      );
      setComplianceState({ status: "SUCCESS", value: complianceResult });
    } catch (error) {
      setComplianceState({ status: "FAILED", error: error.message });
    }
  };

  useEffect(() => {
    (async function () {
      const { element } = await Forma.elements.getByPath({
        path: selection[0],
      });
      const parcelnumb = element.properties?.parcelnumb;
      // We only update the parcel number property when we select a new parcel
      // with a valid parcelnumb.
      if (parcelnumb) {
        if (constraintGenerationState.status == "SUCCESS") {
          // TODO(maxdumas): Delete existing constraint.
        }

        setParcelNumber(parcelnumb);
        setConstraintGenerationState({ status: "NOT_STARTED" });
        setComplianceState({ status: "NOT_STARTED" });
      }
    })();
  }, [selection]);

  if (!parcelNumber) {
    return (
      <h3 style={{ color: "orange" }}>
        Please select a parcel with a valid parcel number.
      </h3>
    );
  }

  // const parcelNumber = "096F N 01700";
  const parcelInfo = useRegridParcelInfo("/us/tn/wilson", parcelNumber);

  if (
    parcelInfo.isLoading ||
    constraintGenerationState.status == "PROCESSING" ||
    complianceState.status == "PROCESSING"
  ) {
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

    const zoningInfo = {
      id: zoningId,
      name: zoneName,
      minFrontSetbackFt,
      minRearSetbackFt,
      minSideSetbackFt,
    };

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
        <ParcelInfoDisplay parcelNumber={parcelNumber} zoning={zoningInfo} />
        <br />
        {complianceState.status === "NOT_STARTED" && (
          <button
            onClick={() => handleGenerateConstraint(zoningInfo)}
            style={{ display: "flex", alignItems: "center" }}
          >
            <forma-analyse-areametrics-24 slot="icon"></forma-analyse-areametrics-24>
            Generate constraints
          </button>
        )}
        <br />
        {constraintGenerationState.status === "SUCCESS" && (
          <button
            onClick={handleCheckElementSatisfiesConstraint}
            style={{ display: "flex", alignItems: "center" }}
          >
            <forma-analyse-areametrics-24 slot="icon"></forma-analyse-areametrics-24>
            Validate against constraint
          </button>
        )}
        {constraintGenerationState.status === "FAILED" && (
          <h3 style={{ color: "orange" }}>
            Failed to generate constraint due to error:&nbsp;
            <code>{constraintGenerationState.error}</code>
          </h3>
        )}
        {complianceState.status === "SUCCESS" && complianceState.value && (
          <h3 style={{ color: "green" }}>Selected object is compliant!</h3>
        )}
        {complianceState.status === "SUCCESS" && !complianceState.value && (
          <h3 style={{ color: "red" }}>Selected object is not compliant!</h3>
        )}
        {complianceState.status === "FAILED" && (
          <h3 style={{ color: "orange" }}>
            Failed to evaluate compliance due to error {complianceState.error}
          </h3>
        )}
      </>
    );
  }
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app"));
}
