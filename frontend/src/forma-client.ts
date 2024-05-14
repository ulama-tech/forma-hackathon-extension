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

export async function createOffsetPolygon(
  polygonPathsToOffset: string[],
  offsetAmount: number
) {
  for (const path of polygonPathsToOffset) {
    const footPrint = await Forma.geometry.getFootprint({ path });
    const coordinates = footPrint?.coordinates;

    const offset = new Offset();
    var [newCoordinates] = offset
      .data(coordinates)
      .arcSegments(3)
      .offset(offsetAmount);

    const polygon: CurveGeometry = {
      type: "curve",
      isClosed: true,
      points: [newCoordinates.reverse()],
    };

    const urn = await addGeojsonElement(polygon);
    return await Forma.proposal.addElement({ urn });
  }
}

export async function compareElements(
  constraintPath: string,
  pathsToEvaluate: string[]
) {
  for (var selectionPath of pathsToEvaluate) {
    const selectionFootprint = await Forma.geometry.getFootprint({
      path: selectionPath,
    });
    console.log("selectionFootprint", selectionFootprint);

    const constraintElement = await Forma.elements.getByPath({
      path: constraintPath,
    });
    const [child] = constraintElement.element.children;
    const childKey = constraintPath + "/" + child.key;
    const constraintFootprint = await Forma.geometry.getFootprint({
      path: childKey,
    });
    console.log("constraintFootprint", constraintFootprint);

    if (
      constraintFootprint?.type == "Polygon" &&
      selectionFootprint?.type == "Polygon"
    ) {
      for (const selectionFootprintCoord of selectionFootprint?.coordinates) {
        console.log(selectionFootprintCoord, constraintElement);
        if (!d3.geoContains(constraintFootprint, selectionFootprintCoord)) {
          return false;
        }
        console.log("Passed!");
      }
    } else {
      throw new Error(
        "Unable to validate geometry against generated constraints."
      );
    }

    return true;
  }
}
