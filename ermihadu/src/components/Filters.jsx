export default function Filters() {
  return (
    <div className="filters">
      <select>
        <option>Size</option>
        <option>Small</option>
        <option>Medium</option>
        <option>Large</option>
        <option>Huge</option>
      </select>

      <select>
        <option>Recency</option>
        <option>Last to first</option>
        <option>First to last</option>
      </select>

      <select>
        <option>Person</option>
      </select>
    </div>
  );
}
