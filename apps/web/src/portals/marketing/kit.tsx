/** Small shared pieces for the marketing screens. */
export { Badge, Button, Card, Confirm, DataTable as UiTable, ErrorBox, Field, ImageUpload, Input, Loading, Modal, Notice, PageHeader, Select, Stat, Tabs, Textarea } from '../../ui';
export { DataTable, Fetch, del, post, put, useForm } from '../admin/common';
import { DataTable } from '../admin/common';
export { DataTable as DT };
export function Seg({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return <div className="seg" role="group" aria-label={label} style={{ marginBottom: 10 }}>{options.map(([v, l]) => <button key={v} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}</div>;
}
void DataTable;
