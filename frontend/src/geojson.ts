export type Point = [number, number];
export type PointGeometry = { points: Point[]; type: "point" };
export type CurveGeometry = {
  points: Point[];
  isClosed: boolean;
  type: "curve";
};

export function createFeatureCollectionWithPolygon(coordinates: Point[]) {
  function areCoordinatesEqual(coord1: Point, coord2: Point) {
    return coord1[0] === coord2[0] && coord1[1] === coord2[1];
  }

  // Close the polygon
  if (
    !areCoordinatesEqual(coordinates[0], coordinates[coordinates.length - 1])
  ) {
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
