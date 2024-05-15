import useSWR from "swr";

export function useRegridParcelInfo(path: string, parcelnumb: string) {
  const params = new URLSearchParams({
    token: import.meta.env.VITE_REGRID_API_TOKEN,
    return_geometry: "false",
    return_matched_buildings: "false",
    return_enhanced_ownership: "false",
    path,
    "fields[parcelnumb][eq]": parcelnumb,
  });
  return useSWR(
    `https://app.regrid.com/api/v2/parcels/query?${params.toString()}`,
    (url) => fetch(url).then((res) => res.json())
  );
}
