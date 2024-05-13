export type MeshGeometry = { vertices: number[][]; type: "mesh" };
export type PointGeometry = { points: number[][]; type: "point" };
export type CurveGeometry = {
  points: number[][];
  isClosed: boolean;
  type: "curve";
};

export function createFeatureCollectionWithPolygon(coordinates: number[][]) {
  function areCoordinatesEqual(coord1: number[], coord2: number[]) {
    return coord1[0] === coord2[0] && coord1[1] === coord2[1];
  }

  // Close the polygon
  if (
    !areCoordinatesEqual(coordinates[0], coordinates[coordinates.length - 1])
  ) {
    console.log("Closing polygon");
    coordinates.push(coordinates[0]);
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates,
        },
        properties: {},
      },
    ],
  };
}
