export type Section = { h: string; p: string[] }

/** Shared shell for the two legal pages. Prose only, one column, generous measure. */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string
  updated: string
  sections: Section[]
}) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-label">{title}</h1>
      <p className="mt-2 text-sm text-label-3">Last updated {updated}</p>
      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.h}>
            <h2 className="text-lg font-medium text-label">{section.h}</h2>
            {section.p.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-3 text-[15px] text-label-2">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  )
}
