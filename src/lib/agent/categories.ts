/**
 * What the owner agent can do, grouped the way the owner thinks about her shop.
 *
 * Client safe on purpose: the UI renders these as starting points so a non
 * technical owner is never staring at an empty box wondering what to type. Kept
 * out of owner-prompt.ts because that module is server-only.
 */
export const ASK_CATEGORIES = [
  {
    // First, because a new shop's first question is "what now". The rows of
    // the setup spine are the answer, and the agent reads the same rules.
    id: 'setup',
    km: 'ចាប់ផ្តើម',
    en: 'Set up',
    examples: [
      'នៅសល់អ្វីខ្លះមុនហាងដំណើរការ?',
      'គណនី Bakong របស់ខ្ញុំគឺ sokha@wing',
      'សរសេរគេហទំព័រហាងឱ្យខ្ញុំ',
      'ផ្សាយគេហទំព័រហាង',
    ],
  },
  {
    id: 'organize',
    km: 'រៀបចំ',
    en: 'Organize',
    examples: [
      'បន្ថែមសេវាកម្ម កាត់សក់កុមារ ១០០០០៛ ២០ នាទី',
      'ដំឡើងតម្លៃលាបសក់ ៥០០០៛',
      'ខ្ញុំមានបន្ទប់ ១០១ ដល់ ១២០',
      'បិទថ្ងៃអាទិត្យ',
    ],
  },
  {
    id: 'plan',
    km: 'គ្រោងទុក',
    en: 'Plan',
    examples: [
      'ថ្ងៃនេះមានអ្វីខ្លះ?',
      'សប្តាហ៍នេះថ្ងៃណាទំនេរ?',
      'អ្នកណាជំពាក់លុយ?',
      'សេវាកម្មណាចំណេញជាងគេ?',
    ],
  },
  {
    id: 'operate',
    km: 'ដំណើរការ',
    en: 'Operate',
    examples: [
      'ថ្ងៃនេះមានការកក់ប៉ុន្មាន?',
      'ផ្តល់បញ្ជីអតិថិជន',
    ],
  },
] as const

/**
 * The two operate chips used to read `MN7Q1A បានមកហើយ` and `MN9X5C មិនបានមក`.
 * Those are not illustrations, they are the literal booking codes from
 * `db/seed.sql`, so an owner who tapped one sent a code that does not exist in
 * their own shop to the real /api/ask and was told so. A starting point that
 * cannot work is worse than an empty box.
 *
 * So the code comes from the owner's own day. With no booking yet there is no
 * code to name, and the two reads below answer correctly against an empty shop.
 */
export function operateExamples(bookingCode: string | null): readonly [string, string] {
  if (!bookingCode) return [ASK_CATEGORIES[2].examples[0], ASK_CATEGORIES[2].examples[1]]
  return [`${bookingCode} បានមកហើយ`, `${bookingCode} មិនបានមក`]
}
