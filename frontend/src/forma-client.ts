import * as d3 from "d3";
import { Forma } from "forma-embedded-view-sdk/auto";
import useSWR from "swr";
import { FeatureCollection, Polygon } from "geojson";
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

export async function addMeshElement(
  geometry: MeshGeometry,
  properties: { [key: string]: any } = {}
) {
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
              format: "Mesh",
              verts: geometry.vertices,
              faces: Array(geometry.vertices.length / 3)
                .fill(0)
                .map((_, i) => i),
            },
            elementProvider: "dynamo-player",
          },
        },
      },
    },
  });

  return urn;
}

export async function addGeojsonElement(
  geometry: CurveGeometry | PointGeometry,
  properties: { [key: string]: any } = {}
) {
  const geoJson = createFeatureCollectionWithPolygon(geometry.points);
  console.log("geoJson", geoJson);

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
            elementProvider: "dynamo-player",
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

export async function addElement(element: CreateIntegrateElement) {
  let urn;
  if (element.geometry.type == "mesh") {
    urn = await addMeshElement(element.geometry, element.properties);
  } else if (
    element.geometry.type == "curve" ||
    element.geometry.type == "point"
  ) {
    urn = await addGeojsonElement(element.geometry, element.properties);
  } else {
    throw new Error(`Invalid geometry type`);
  }

  await Forma.proposal.addElement({ urn });
}

export const drawPolygon = async (selectedPaths: string[]) => {
  for (let selectPath of selectedPaths) {
    const footPrint = await Forma.geometry.getFootprint({ path: selectPath });
    const coordinates = footPrint?.coordinates;
    console.log(footPrint);
    let x = -3;

    let offset = new Offset();
    let margined = offset.data(coordinates).margin(10);
    let padding = offset.data(coordinates).padding(10);

    var newCoordinates = offset.data(coordinates).arcSegments(3).offset(x);
    var polyline = offset.data(coordinates).offsetLine(5);

    const polygon: CurveGeometry = {
      type: "curve",
      isClosed: true,
      points: newCoordinates.reverse(),
    };

    addGeojsonElement(polygon);
  }
};

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
