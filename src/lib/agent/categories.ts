/**
 * What the owner agent can do, grouped the way the owner thinks about her shop.
 *
 * Client safe on purpose: the UI renders these as starting points so a non
 * technical owner is never staring at an empty box wondering what to type. Kept
 * out of owner-prompt.ts because that module is server-only.
 */
export const ASK_CATEGORIES = [
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
      'MN7Q1A បានមកហើយ',
      'ទទួលលុយសុទ្ធ ៣០០០០៛ ពី MN7Q1A',
      'MN9X5C មិនបានមក',
      'ផ្តល់បញ្ជីអតិថិជន',
    ],
  },
] as const
