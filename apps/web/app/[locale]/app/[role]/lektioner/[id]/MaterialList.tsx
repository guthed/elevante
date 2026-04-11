'use client';

import { useState, useTransition } from 'react';
import { getMaterialDownloadUrl } from '@/app/actions/materials';

type Material = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type Props = {
  materials: Material[];
  emptyText: string;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MaterialList({ materials, emptyText }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (materials.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">{emptyText}</p>
    );
  }

  const handleOpen = (material: Material) => {
    setPendingId(material.id);
    startTransition(async () => {
      const url = await getMaterialDownloadUrl(material.storage_path);
      setPendingId(null);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  };

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {materials.map((material) => (
        <li key={material.id} className="py-3">
          <button
            type="button"
            onClick={() => handleOpen(material)}
            disabled={pendingId === material.id}
            className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-60"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--color-primary)]">
                {material.name}
              </div>
              <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                {formatSize(material.size_bytes)}
                {material.mime_type ? ` · ${material.mime_type.split('/')[1] ?? material.mime_type}` : ''}
              </div>
            </div>
            <span aria-hidden="true" className="text-[var(--color-accent)]">
              ↗
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
