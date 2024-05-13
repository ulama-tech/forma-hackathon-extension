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
    Forma.proposal.addElement({ urn });
  }
}

export async function compareElements(const_path: string) {
  var selections = await Forma.selection.getSelection();
  for (var path in selections) {
    const geo_footprint = await Forma.geometry.getFootprint({ path: path });
    // const_path will be the path to the constraint jose creates
    const const_footprint = await Forma.geometry.getFootprint({
      path: const_path,
    });
    if (
      const_footprint?.type == "Polygon" &&
      geo_footprint?.type == "Polygon"
    ) {
      for (var geo_coordinate in geo_footprint?.coordinates) {
        if (!d3.geoContains(const_footprint, geo_coordinate)) {
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
