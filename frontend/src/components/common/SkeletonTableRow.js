import React from 'react';

export default function SkeletonTableRow({ columns = 4 }) {
  return (
    <tr className="animate-pulse border-b border-gray-50" aria-hidden>
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className="py-4 px-4">
          <div
            className={`h-4 bg-gray-100 rounded-md ${i === 0 ? 'w-3/4 max-w-[200px]' : 'w-24'}`}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTableRows({ rows = 5, columns = 4 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </>
  );
}
