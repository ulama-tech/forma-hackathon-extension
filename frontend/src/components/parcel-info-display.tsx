export type Zoninginfo = {
  name: string;
  id: string;
  minFrontSetbackFt: number;
  minRearSetbackFt: number;
  minSideSetbackFt: number;
};

export type ParcelInfoDisplayProps = {
  parcelNumber: string;
  zoning: Zoninginfo;
};

export function ParcelInfoDisplay(props: ParcelInfoDisplayProps) {
  return (
    <table>
      <tr>
        <th>Parcel Number</th>
        <td>
          <code>{props.parcelNumber}</code>
        </td>
      </tr>
      <tr>
        <th>Zoning District</th>
        <td>
          <code>
            {props.zoning.name} ({props.zoning.id})
          </code>
        </td>
      </tr>
      <tr>
        <th>Min Front Setback</th>
        <td>{props.zoning.minFrontSetbackFt} ft</td>
      </tr>
      <tr>
        <th>Min Rear Setback</th>
        <td>{props.zoning.minRearSetbackFt} ft</td>
      </tr>
      <tr>
        <th>Min Side Setback</th>
        <td>{props.zoning.minRearSetbackFt} ft</td>
      </tr>
    </table>
  );
}
