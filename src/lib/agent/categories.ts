/**
 * What the owner agent can do, grouped the way the owner thinks about her shop.
 *
 * Client safe on purpose: these are the sentences a non technical owner is
 * offered so she is never staring at an empty box wondering what to type. Kept
 * out of owner-prompt.ts because that module is server-only.
 *
 * The groups are a filing system for THIS file and nothing else. They were once
 * four tabs in the ask panel, and the tab never left the browser: `/api/ask` is
 * posted the text and nothing more, so the owner was classifying her request
 * for an audience of nobody. `lib/agent/suggestions.ts` picks from these by
 * what the shop is actually missing instead.
 *
 * Two of the groups carry invented values (`sokha@wing`, a sample menu), and
 * the operate pair once carried the literal booking codes from `db/seed.sql`,
 * so an owner who tapped one sent a code her shop had never issued to the real
 * agent and was told so. Anything offered as a starting point must work in the
 * shop looking at it: a starting point that cannot is worse than an empty box.
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
      'បន្ថែមម៉ឺនុយ៖ កាហ្វេទឹកកក ៥០០០៛ តែជូរ ៤០០០៛',
      'ដំឡើងតម្លៃកាហ្វេទៅ ៦០០០៛',
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
