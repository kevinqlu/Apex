// One table of city coordinates. A load with a city missing here fails loudly, in a test, not on a driver's phone.
const CITIES: Record<string, [lat: number, lng: number]> = {
  'Atlanta, GA': [33.749, -84.388],
  'Charlotte, NC': [35.227, -80.843],
  'Dallas, TX': [32.777, -96.797],
  'Houston, TX': [29.76, -95.37],
  'Louisville, KY': [38.253, -85.759],
  'Memphis, TN': [35.149, -90.049],
  'Nashville, TN': [36.163, -86.782],
  'Oklahoma City, OK': [35.468, -97.516],
};

export interface Coordinates {
  lat: number;
  lng: number;
}

export function cityCoordinates(place: { city: string; state: string }): Coordinates {
  const found = CITIES[`${place.city}, ${place.state}`];
  if (!found) throw new Error(`No coordinates for ${place.city}, ${place.state}`);
  return { lat: found[0], lng: found[1] };
}

const EARTH_RADIUS_MILES = 3958.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMiles(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}
