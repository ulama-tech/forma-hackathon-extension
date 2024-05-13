import * as d3 from "d3";
import { Forma } from "forma-embedded-view-sdk/auto";
import useSWR from "swr";
import Offset from "polygon-offset";
import {
  CurveGeometry,
  MeshGeometry,
  PointGeometry,
  createFeatureCollectionWithPolygon,
} from "./geojson";

export function useFormaAccessToken() {
  return useSWR("get-forma-access-token", () =>
    Forma.auth.acquireTokenOverlay()
  );
}

export function useProjectInfo() {
  const accessToken = useFormaAccessToken();

  return useSWR(
    () => [
      `https://developer.api.autodesk.com/forma/project/v1alpha/projects/${encodeURIComponent(
        Forma.getProjectId()
      )}`,
      accessToken.data.accessToken,
    ],
    ([url, token]) =>
      fetch(url, {
        headers: {
          authorization: `Bearer ${token}`,
          "x-ads-region": Forma.getRegion(),
          accept: "application/json",
        },
      }).then((res) => res.json())
  );
}

export async function addGeojsonElement(
  geometry: CurveGeometry | PointGeometry,
  properties: { [key: string]: any } = {}
) {
  const geoJson = createFeatureCollectionWithPolygon(geometry.points);
  console.log("geoJson", JSON.stringify(geoJson));

  const { urn } = await Forma.integrateElements.createElementHierarchy({
    authcontext: Forma.getProjectId(),
    data: {
      rootElement: "root",
      elements: {
        root: {
          id: "root",
          properties: {
            ...properties,
            geometry: {
              type: "Inline",
              format: "GeoJSON",
              geoJson,
            },
          },
        },
      },
    },
  });

  return urn;
}

export type CreateIntegrateElement = {
  properties: { [key: string]: any };
  geometry: MeshGeometry | PointGeometry | CurveGeometry;
};

export async function drawPolygon(selectedPaths: string[]) {
  for (let selectPath of selectedPaths) {
    const footPrint = await Forma.geometry.getFootprint({ path: selectPath });
    const coordinates = footPrint?.coordinates;
    let x = -3;

    let offset = new Offset();

    var newCoordinates = offset.data(coordinates).arcSegments(3).offset(x);

    const polygon: CurveGeometry = {
      type: "curve",
      isClosed: true,
      points: [newCoordinates[0].reverse()],
    };

    const urn = await addGeojsonElement(polygon);
    const { path } = await Forma.proposal.addElement({ urn });
    return path;
  }
}

export async function compareElements(constraintPath: string) {
  var selections = await Forma.selection.getSelection();
  console.log(constraintPath);
  console.log(selections);
  for (var selectionPath of selections) {
    console.log("A", selectionPath);
    const selectionFootprint = await Forma.geometry.getFootprint({
      path: selectionPath,
    });
    console.log("B", selectionFootprint);
    const constraintFootprint = await Forma.geometry.getFootprint({
      path: constraintPath,
    });
    console.log("C", constraintFootprint);
    if (
      constraintFootprint?.type == "Polygon" &&
      selectionFootprint?.type == "Polygon"
    ) {
      for (var geo_coordinate in selectionFootprint?.coordinates) {
        if (!d3.geoContains(constraintFootprint, geo_coordinate)) {
          return false;
        }
      }
    } else {
      throw new Error(
        "Unable to validate geometry against generated constraints."
      );
    }

    return true;
  }
}
