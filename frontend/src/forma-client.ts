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

function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
) {
  let x = point[0],
    y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i][0],
      yi = polygon[i][1];
    let xj = polygon[j][0],
      yj = polygon[j][1];

    let intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function isPolygonContained(
  innerPolygon: [number, number][],
  outerPolygon: [number, number][]
) {
  for (let point of innerPolygon) {
    if (!isPointInPolygon(point, outerPolygon)) {
      return false;
    }
  }
  return true;
}

export async function elementsSatisfyConstraint(
  constraintPath: string,
  pathsToEvaluate: string[]
) {
  for (var selectionPath of pathsToEvaluate) {
    const selectionFootprint = await Forma.geometry.getFootprint({
      path: selectionPath,
    });
    const constraintElement = await Forma.elements.getByPath({
      path: constraintPath,
    });
    const [child] = constraintElement.element.children;
    const childKey = constraintPath + "/" + child.key;
    const constraintFootprint = await Forma.geometry.getFootprint({
      path: childKey,
    });

    if (
      constraintFootprint?.type != "Polygon" ||
      selectionFootprint?.type != "Polygon"
    ) {
      throw new Error(
        "Unable to validate geometry against generated constraints."
      );
    }

    return isPolygonContained(
      selectionFootprint.coordinates,
      constraintFootprint.coordinates
    );
  }
}
