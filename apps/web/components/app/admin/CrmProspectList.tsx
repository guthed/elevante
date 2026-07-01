import type { ProspectListItem } from '@/lib/data/admin';

type Dict = {
  synced: string;
  empty: string;
  openNotion: string;
  cols: { name: string; kommun: string; students: string; status: string; synced: string };
};

export function CrmProspectList({ items, dict }: { items: ProspectListItem[]; dict: Dict }) {
  if (items.length === 0) return <p className="text-ink/60">{dict.empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-ink/60">
        <tr>
          <th className="py-2">{dict.cols.name}</th>
          <th>{dict.cols.kommun}</th>
          <th>{dict.cols.students}</th>
          <th>{dict.cols.status}</th>
          <th>{dict.cols.synced}</th>
          <th />
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/10">
        {items.map((p) => (
          <tr key={p.code}>
            <td className="py-2 font-medium">{p.name}</td>
            <td>{p.municipality ?? '—'}</td>
            <td>{p.students ?? '—'}</td>
            <td>{p.syncStatus ?? '—'}</td>
            <td>{p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleDateString('sv-SE') : '—'}</td>
            <td>
              {p.notionPageId && (
                <a
                  className="text-accent underline"
                  href={`https://www.notion.so/${p.notionPageId.replace(/-/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {dict.openNotion}
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
