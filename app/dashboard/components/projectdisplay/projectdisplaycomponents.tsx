export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="p-4 border-b-2 border-black dark:border-white flex justify-between items-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <button onClick={onClose} className="text-2xl hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1 rounded">×</button>
    </div>
  )
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 dark:border-gray-700 pb-2">
      {title}
    </h3>
  )
}

export function PagesSection({ pages }: { pages: { route: string; file: string }[] }) {
  return (
    <section>
      <SectionHeader title="Project Pages" />
      {pages.length > 0
        ? pages.map((page, idx) => (
            <div key={idx} className="flex gap-4 p-3 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm mb-2">
              <span className="font-semibold min-w-[80px] text-blue-600 dark:text-blue-400">{page.route}</span>
              <span className="flex-1">{page.file}</span>
            </div>
          ))
        : <p className="text-gray-500 text-sm">No pages configured</p>
      }
    </section>
  )
}

export function EndpointsSection({ endpoints }: { endpoints: { method: string; path: string, handler: string }[] }) {
  return (
    <section>
      <SectionHeader title="API Endpoints" />
      {endpoints.length > 0
        ? endpoints.map((ep, idx) => (
            <div key={idx} className="flex gap-4 p-3 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm mb-2">
              <span className="font-semibold min-w-[80px] text-blue-600 dark:text-blue-400">{ep.method}</span>
              <span className="flex-1">{ep.path}</span>
              <span className="flex-1">{ep.handler}</span>
            </div>
          ))
        : <p className="text-gray-500 text-sm">No endpoints configured</p>
      }
    </section>
  )
}

export function DatabaseSection({ db_schema }: { db_schema: Record<string, any[]> }) {
  return (
    <section>
      <SectionHeader title="Database Schema" />
      {Object.keys(db_schema).length > 0
        ? Object.entries(db_schema).map(([tableName, columns]) => (
            <div key={tableName} className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden mb-4">
              <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 font-semibold">{tableName}</div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-700">
                      <th className="text-left py-2 px-3">Column</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Nullable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                        <td className="py-2 px-3 font-mono">{col.column}</td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{col.type}</td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{col.nullable ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        : <p className="text-gray-500 text-sm">No database schema available</p>
      }
    </section>
  )
}

export function EnvsSection({ envs }: { envs: { key: string; value: string; is_secret: boolean }[] }) {
  return (
    <section>
      <SectionHeader title="Environment Variables" />
      {envs.length > 0
        ? envs.map((env, idx) => (
            <div key={idx} className="flex gap-4 p-3 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm mb-2">
              <span className="font-semibold min-w-[200px]">{env.key}</span>
              <span className="flex-1 text-gray-600 dark:text-gray-400">{env.is_secret ? "••••••••" : env.value}</span>
            </div>
          ))
        : <p className="text-gray-500 text-sm">No environment variables configured</p>
      }
    </section>
  )
}

export function DangerZone({ deleteConfirm, onChange, onDelete }: {
  deleteConfirm: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: () => void
}) {
  return (
    <section className="border-2 border-red-500 rounded p-4">
      <h3 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h3>
      <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
        Deleting this project will remove all data, containers, and configurations. This action cannot be undone.
      </p>
      <input
        type="text"
        value={deleteConfirm}
        onChange={onChange}
        className="border-2 border-red-500 p-2 w-full mb-2 rounded"
        placeholder="Type DELETE to confirm"
      />
      <button
        onClick={onDelete}
        disabled={deleteConfirm !== "DELETE"}
        className="bg-red-500 text-white px-4 py-2 w-full rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Delete Project Permanently
      </button>
    </section>
  )
}