import useSWR from "swr";

const API_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyZWdyaWQuY29tIiwiaWF0IjoxNzE1MTk5NDk4LCJleHAiOjE3MTc3OTE0OTgsInUiOjQwMjQwOCwiZyI6MjMxNTMsImNhcCI6InBhOnRzOnBzOmJmOm1hOnR5OmVvOnpvOnNiIn0.d1hmYv_AFY_P7NPzs2Sy2vFzqDZA4eKuL0nSVfszVpM";

export function useRegridParcelInfo(path: string, parcelnumb: string) {
  const params = new URLSearchParams({
    token: API_TOKEN,
    return_geometry: "false",
    return_matched_buildings: "false",
    return_enhanced_ownership: "false",
    "fields[parcelnumb][eq]": parcelnumb,
  });
  return useSWR(
    `https://app.regrid.com/api/v2/parcels/query?${params.toString()}`,
    (url) => fetch(url).then((res) => res.json())
  );
}
