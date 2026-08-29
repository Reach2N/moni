/**
 * Copy for the public surface, Khmer first with an English switch.
 *
 * This stays a small typed dictionary instead of introducing an i18n runtime.
 * The landing page has two locales and no plural rules, while a route segment
 * would fight the future tenant subdomain rewrite described in ARCHITECTURE.md.
 *
 * KHMER REVIEW PENDING. The Khmer text is a product draft and needs a native
 * reader's pass for tone and idiom before the site is shown to shop owners.
 */

export const LOCALES = ['km', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

type Faq = { q: string; a: string }
/** `panel` captions the product panel the pinned step sequence shows alongside. */
type Step = { title: string; body: string; panel: string }
type ShopKind = { name: string; detail: string }

export type Copy = {
  /**
   * Micro-labels: badges, hints, units, scroll cues.
   *
   * These used to be written inline as `locale === 'km' ? 'ឥឡូវនេះ' : 'Now'`
   * inside JSX, scattered across page.tsx and the hero. That pattern type checks
   * and reads fine, which is exactly why a missing locale survives review: there
   * is nothing to fail. Every user-visible string belongs in this dictionary.
   */
  ui: {
    statusStrip: string
    capabilities: string
    explore: string
    rows: string
    badgeNow: string
    badgeNext: string
    build: string
    submitHint: string
    working: string
    outputLabel: string
    outputValue: string
  }
  nav: {
    apply: string
    other: string
    otherHref: Locale
    how: string
    proof: string
    faq: string
  }
  hero: {
    eyebrow: string
    headline: string
    sub: string
    cta: string
    secondary: string
    reassure: string
    trust: [string, string, string]
  }
  demo: {
    label: string
    title: string
    typed: string
    tableHead: [string, string, string]
    caption: string
    voice: string
    replay: string
    ready: string
    example: string
    privateNote: string
  }
  steps: {
    eyebrow: string
    title: string
    body: string
    items: [Step, Step, Step]
  }
  proof: {
    eyebrow: string
    title: string
    body: string
    customerLabel: string
    customerMessage: string
    assistantLabel: string
    assistantMessage: string
    bookingLabel: string
    bookingValue: string
    bookingStatus: string
    ownerNote: string
    handoff: string
    handoffBody: string
  }
  breadth: {
    eyebrow: string
    title: string
    body: string
    kinds: [ShopKind, ShopKind, ShopKind]
  }
  channels: {
    eyebrow: string
    title: string
    body: string
    now: string
    nowNote: string
    next: string
    nextNote: string
    /** Real-shaped customer messages, marqueed past the channel card. */
    samples: [string, string, string, string, string]
  }
  pricing: {
    eyebrow: string
    title: string
    headline: string
    body: string
    points: [string, string, string]
    /** The free-tier allowance, counted up on entry. A number, not a string:
        it is a quantity, so it renders through src/lib/format/khmer.ts. */
    figure: number
    figureUnit: string
  }
  faq: { title: string; items: [Faq, Faq, Faq, Faq] }
  waitlist: {
    eyebrow: string
    title: string
    body: string
    label: string
    placeholder: string
    noteLabel: string
    notePlaceholder: string
    submit: string
    submitting: string
    okTitle: string
    okBody: string
    nextSteps: [string, string, string]
    appLink: string
    appLinkNote: string
    privacyNotice: string
    errInvalid: string
    errGeneric: string
    errBusy: string
  }
  footer: { privacy: string; terms: string; contact: string; rights: string }
}

const km: Copy = {
  ui: {
    statusStrip: 'Moni · ជំនួយការហាងរបស់អ្នក',
    capabilities: 'សំឡេង · សារ · ការកក់ · ការទូទាត់',
    explore: 'រុករក',
    rows: 'ជួរ',
    badgeNow: 'ឥឡូវនេះ',
    badgeNext: 'បន្ទាប់',
    build: 'រៀបចំ',
    submitHint: '⌘↵ ដើម្បីរៀបចំ',
    working: 'Moni កំពុងរៀបចំ',
    outputLabel: 'លទ្ធផល',
    outputValue: 'រួចរាល់ដើម្បីពិនិត្យ',
  },
  nav: {
    apply: 'ដាក់ពាក្យ',
    other: 'English',
    otherHref: 'en',
    how: 'របៀបដំណើរការ',
    proof: 'ការបង្ហាញ',
    faq: 'សំណួរ',
  },
  hero: {
    eyebrow: 'សម្រាប់ម្ចាស់ហាងតូចនៅកម្ពុជា',
    headline: 'ហាងរបស់អ្នកឆ្លើយអតិថិជន ពេលដៃអ្នករវល់',
    sub: 'ប្រាប់ Moni ពីហាងរបស់អ្នកជាភាសាធម្មតា ដោយវាយ ឬនិយាយ។ វាឆ្លើយសារ ពិនិត្យម៉ោងទំនេរ និងកក់ជំនួសអ្នក។',
    cta: 'ដាក់ពាក្យជាហាងស្ថាបនិក',
    secondary: 'មើលរបៀបដំណើរការ',
    reassure: 'យើងរៀបចំហាងដំបូងដោយផ្ទាល់។ ឥតគិតថ្លៃពេលយើងកំពុងសាងសង់។',
    trust: ['ភាសាខ្មែរ និងអង់គ្លេស', 'អតិថិជនមិនត្រូវដំឡើងអ្វី', 'អ្នកតែងតែអាចចូលមកកាន់កាប់វិញ'],
  },
  demo: {
    label: 'ការបង្ហាញឧទាហរណ៍',
    title: 'អ្វីដែលម្ចាស់ហាងប្រាប់ Moni',
    typed: 'កាត់សក់ ១៥០០០ រៀល លាងសក់ ៨០០០ រៀល បើក ៨ ព្រឹក ដល់ ៥ ល្ងាច',
    tableHead: ['សេវាកម្ម', 'តម្លៃ', 'រយៈពេល'],
    caption: 'មួយឃ្លាចូល។ បញ្ជីសេវាកម្មរួចរាល់។',
    voice: 'សាកស្តាប់ការបង្ហាញសំឡេង',
    replay: 'ចាក់ការបង្ហាញម្ដងទៀត',
    ready: 'បញ្ជីតម្លៃរួចរាល់',
    example: 'ទិន្នន័យឧទាហរណ៍',
    privateNote: 'ការបង្ហាញនេះមិនផ្ញើទិន្នន័យទេ',
  },
  steps: {
    eyebrow: 'ចាប់ផ្តើមដោយមិនចាំបាច់រៀនកម្មវិធី',
    title: 'មួយឃ្លា បីជំហាន ទៅហាងដែលរៀបរួច',
    body: 'Moni រៀនពីរបៀបដែលអ្នកនិយាយអំពីហាងរបស់អ្នក។ អ្នកពិនិត្យអ្វីដែលវារៀបចំ ហើយបើកឲ្យវាជួយឆ្លើយ។',
    items: [
      { title: 'ប្រាប់ពីហាងរបស់អ្នក', body: 'វាយ ឬនិយាយអំពីសេវាកម្ម តម្លៃ និងម៉ោងបើក។ មិនចាំបាច់គូរលំហូរសារ។', panel: 'ឃ្លាមួយពីម្ចាស់ហាង' },
      { title: 'ពិនិត្យអ្វីដែលបានរៀបចំ', body: 'បញ្ជីតម្លៃ និងម៉ោងរបស់អ្នកនៅជាកន្លែងតែមួយ។ អ្នកអាចកែបានគ្រប់ពេល។', panel: 'បញ្ជីសេវាកម្មដែលរៀបរួច' },
      { title: 'ឲ្យ Moni ជួយឆ្លើយ', body: 'វាឆ្លើយតាមទិន្នន័យពិត ពិនិត្យម៉ោងទំនេរ និងប្រគល់សារមិនច្បាស់មកអ្នក។', panel: 'ការសន្ទនាជាមួយអតិថិជន' },
    ],
  },
  proof: {
    eyebrow: 'ការងារដែលវាធ្វើជំនួសអ្នក',
    title: 'ពីសារមួយ ទៅការកក់ដែលច្បាស់លាស់',
    body: 'អតិថិជននិយាយធម្មតា។ Moni អានពីបញ្ជីរបស់អ្នក ហើយកត់ត្រាអ្វីដែលបានព្រមព្រៀង។',
    customerLabel: 'អតិថិជន',
    customerMessage: 'សួស្តី ខ្ញុំចង់កក់កាត់សក់ថ្ងៃស្អែក ម៉ោង ១០ ព្រឹក',
    assistantLabel: 'Moni',
    assistantMessage: 'បាន។ ម៉ោង ១០ ព្រឹកនៅទំនេរ។ តម្លៃ ១៥០០០៛។ ខ្ញុំកក់ឲ្យទេ?',
    bookingLabel: 'ការកក់បានបញ្ជាក់',
    bookingValue: 'កាត់សក់ · ១០:០០ ព្រឹក',
    bookingStatus: 'បានកត់ត្រា',
    ownerNote: 'ម្ចាស់ហាងឃើញភ្លាមៗ',
    handoff: 'មិនច្បាស់? ប្រគល់ឲ្យម្ចាស់ហាង',
    handoffBody: 'Moni មិនស្មានតម្លៃ ឬម៉ោងទំនេរទេ។ វាឈប់ ហើយទុកឲ្យអ្នកសម្រេច។',
  },
  breadth: {
    eyebrow: 'ហាងមួយ មិនមែនប្រភេទតែមួយ',
    title: 'រៀបតាមអ្វីដែលអ្នកលក់',
    body: 'សេវាកម្ម ផលិតផល និងការកក់អាចនៅជាមួយគ្នា។ Moni ចាប់ផ្តើមពីរបៀបធ្វើការរបស់អ្នក មិនមែនពីទម្រង់រឹងមួយទេ។',
    kinds: [
      { name: 'ហាងកាត់សក់', detail: 'សេវាកម្ម និងម៉ោង' },
      { name: 'ហាងកាហ្វេ', detail: 'ផលិតផល និងការកក់តុ' },
      { name: 'ផ្ទះសំណាក់', detail: 'បន្ទប់ និងការកក់យប់' },
    ],
  },
  channels: {
    eyebrow: 'អតិថិជននៅកន្លែងណា Moni នៅទីនោះ',
    title: 'ចាប់ផ្តើមពីបណ្តាញដែលអ្នកប្រើរួច',
    body: 'សារមកក្នុងប្រអប់តែមួយ។ Telegram ចាប់ផ្តើមមុន ព្រោះភ្ជាប់បានលឿន។ Messenger គឺជាជំហានបន្ទាប់។',
    now: 'Telegram',
    nowNote: 'កំពុងរៀបចំសម្រាប់ការចាប់ផ្តើម',
    next: 'Messenger',
    nextNote: 'ជំហានបន្ទាប់',
    samples: [
      'ថ្ងៃស្អែកម៉ោង ១០ ទំនេរទេ?',
      'កាត់សក់ថ្លៃប៉ុន្មាន?',
      'បើកម៉ោងប៉ុន្មានថ្ងៃអាទិត្យ?',
      'ខ្ញុំចង់ប្តូរម៉ោងកក់',
      'អាចបង់ប្រាក់តាម KHQR បានទេ?',
    ],
  },
  pricing: {
    eyebrow: 'តម្លៃដែលងាយយល់',
    title: 'ចាប់ផ្តើមដោយឥតគិតថ្លៃ',
    headline: 'បង់តែពេលហាងអ្នករកបាន',
    body: 'មិនមានថ្លៃប្រចាំខែសម្រាប់ការចាប់ផ្តើមទេ។ យើងនឹងប្រាប់តម្លៃជាមុន នៅពេលការគិតថ្លៃចាប់ផ្តើម។',
    points: ['ប្រតិបត្តិការ ១០០ ដំបូងក្នុងមួយខែ ឥតគិតថ្លៃ', 'គ្មានកាតឥណទានពេលដាក់ពាក្យ', 'ទិន្នន័យហាងជារបស់អ្នក និងអាចនាំចេញបាន'],
    figure: 100,
    figureUnit: 'ប្រតិបត្តិការក្នុងមួយខែ ឥតគិតថ្លៃ',
  },
  faq: {
    title: 'សំណួរដែលម្ចាស់ហាងសួរ',
    items: [
      { q: 'តើ Moni និយាយខ្មែរបានទេ?', a: 'បាន។ Moni អាន និងឆ្លើយជាភាសាខ្មែរ រួមទាំងលេខខ្មែរ និងវិធីនិយាយអំពីម៉ោង។ វាឆ្លើយជាភាសាអង់គ្លេសពេលអតិថិជនសរសេរអង់គ្លេស។' },
      { q: 'បើវាមិនប្រាកដ វាធ្វើអ្វី?', a: 'វាមិនស្មានតម្លៃ ឬម៉ោងទំនេរទេ។ វាបញ្ឈប់ការសន្យា ហើយប្រគល់សារមកអ្នក ដើម្បីឲ្យអ្នកសម្រេច។' },
      { q: 'តើអតិថិជនត្រូវដំឡើងកម្មវិធីថ្មីទេ?', a: 'មិនត្រូវទេ។ ពួកគេអាចសរសេរតាម Telegram ឬបណ្តាញដែលហាងអ្នកភ្ជាប់។' },
      { q: 'ហេតុអ្វីត្រូវដាក់ពាក្យ?', a: 'យើងរៀបចំហាងដំបូងៗដោយផ្ទាល់ម្នាក់ម្តង។ យើងចង់ឲ្យវាដំណើរការពិតប្រាកដសម្រាប់ហាងអ្នក មុននឹងបើកទូលំទូលាយ។' },
    ],
  },
  waitlist: {
    eyebrow: 'ក្រុមហាងស្ថាបនិក',
    title: 'ចូលរួមកសាង Moni ជាមួយយើង',
    body: 'ទុកអ៊ីមែល និងប្រាប់យើងបន្តិចអំពីហាងអ្នក។ យើងនឹងទាក់ទងទៅវិញ ហើយរៀបចំជាមួយអ្នកដោយផ្ទាល់។',
    label: 'អ៊ីមែល',
    placeholder: 'you@example.com',
    noteLabel: 'ហាងរបស់អ្នកជាអ្វី? (ជាជម្រើស)',
    notePlaceholder: 'ឧទាហរណ៍៖ ហាងកាហ្វេនៅភ្នំពេញ មានការកក់តុ',
    submit: 'ដាក់ពាក្យ',
    submitting: 'កំពុងផ្ញើ',
    okTitle: 'អ្នកនៅក្នុងក្រុមហាងស្ថាបនិកហើយ',
    okBody: 'អរគុណ។ យើងបានរក្សាទុកពាក្យរបស់អ្នក ហើយនឹងទាក់ទងតាមអ៊ីមែល។',
    nextSteps: ['យើងអានព័ត៌មានហាងរបស់អ្នក', 'យើងទាក់ទងដើម្បីកំណត់ពេលរៀបចំ', 'អ្នកទទួលបានតំណចូលកម្មវិធីពេលដល់វេន'],
    appLink: 'ទៅកាន់កម្មវិធីម្ចាស់ហាង',
    appLinkNote: 'តំណនេះនឹងដំណើរការបន្ទាប់ពីគណនីអ្នកត្រូវបានអនុម័ត។',
    privacyNotice: 'ដោយដាក់ពាក្យ អ្នកយល់ព្រមឲ្យ Moni រក្សាទុកអ៊ីមែលរបស់អ្នកសម្រាប់ការចាប់ផ្តើម។',
    errInvalid: 'សូមពិនិត្យអ៊ីមែលម្តងទៀត។',
    errGeneric: 'ផ្ញើមិនបាន។ សូមព្យាយាមម្តងទៀត។',
    errBusy: 'សូមរង់ចាំបន្តិច រួចព្យាយាមម្ដងទៀត។',
  },
  footer: { privacy: 'គោលការណ៍ឯកជនភាព', terms: 'លក្ខខណ្ឌ', contact: 'ទាក់ទង Moni', rights: 'Moni' },
}

const en: Copy = {
  ui: {
    statusStrip: 'Moni · the assistant for your shop',
    capabilities: 'Voice · messages · bookings · payments',
    explore: 'Explore',
    rows: 'rows',
    badgeNow: 'Now',
    badgeNext: 'Next',
    build: 'Build',
    submitHint: '⌘↵ to build',
    working: 'Moni is organising',
    outputLabel: 'Output',
    outputValue: 'Ready to check',
  },
  nav: { apply: 'Apply', other: 'ភាសាខ្មែរ', otherHref: 'km', how: 'How it works', proof: 'See the proof', faq: 'Questions' },
  hero: {
    eyebrow: 'For small shops in Cambodia',
    headline: 'Your shop answers customers while your hands are busy',
    sub: 'Tell Moni about your shop in plain language, by typing or speaking. It answers messages, checks real availability, and books for you.',
    cta: 'Apply as a founding shop',
    secondary: 'See how it works',
    reassure: 'We set up the first shops by hand. Free while we build.',
    trust: ['Khmer and English', 'Customers install nothing', 'Take over any conversation'],
  },
  demo: {
    label: 'Example preview',
    title: 'What a shop owner tells Moni',
    typed: 'Haircut 15000 riel, wash 8000 riel, open 8am to 5pm',
    tableHead: ['Service', 'Price', 'Time'],
    caption: 'One sentence in. A service list ready to check.',
    voice: 'Play the voice preview',
    replay: 'Replay the preview',
    ready: 'Price list ready',
    example: 'Example data',
    privateNote: 'This preview does not send data',
  },
  steps: {
    eyebrow: 'Start without learning new software',
    title: 'One sentence. Three steps. A shop that is ready.',
    body: 'Moni learns how you talk about your shop. You check what it made, then let it help with the messages you already receive.',
    items: [
      { title: 'Describe your shop', body: 'Type or speak your services, prices, and hours. There is no flow chart to draw.', panel: 'One sentence from the owner' },
      { title: 'Check what it made', body: 'Your catalogue and hours stay in one place. Edit anything, whenever you need.', panel: 'The service list it built' },
      { title: 'Let Moni answer', body: 'It replies from your real data, checks availability, and hands uncertain messages back to you.', panel: 'A conversation with a customer' },
    ],
  },
  proof: {
    eyebrow: 'The work it takes off your plate',
    title: 'From a message to a booking you can trust',
    body: 'Customers speak normally. Moni reads your catalogue and records exactly what was agreed.',
    customerLabel: 'Customer',
    customerMessage: 'Hi, can I book a haircut tomorrow at 10am?',
    assistantLabel: 'Moni',
    assistantMessage: 'Yes. 10am is available. The price is 15,000៛. Shall I book it?',
    bookingLabel: 'Booking confirmed',
    bookingValue: 'Haircut · 10:00am',
    bookingStatus: 'Recorded',
    ownerNote: 'The owner sees it instantly',
    handoff: 'Not sure? Hand it back to the owner',
    handoffBody: 'Moni does not guess a price or promise a slot from memory. It stops and lets you decide.',
  },
  breadth: {
    eyebrow: 'A shop is not one shape',
    title: 'Built around what you sell',
    body: 'Services, products, and bookings can live together. Moni starts with your way of working, not a rigid template.',
    kinds: [
      { name: 'Hair salon', detail: 'Services and time slots' },
      { name: 'Café', detail: 'Products and table bookings' },
      { name: 'Guesthouse', detail: 'Rooms and overnight stays' },
    ],
  },
  channels: {
    eyebrow: 'Wherever your customers already are',
    title: 'Start with the channel you already use',
    body: 'Every message comes into one inbox. Telegram ships first because it is quick to connect. Messenger is next.',
    now: 'Telegram',
    nowNote: 'Preparing for the first shops',
    next: 'Messenger',
    nextNote: 'Coming next',
    samples: [
      'Is 10am free tomorrow?',
      'How much is a haircut?',
      'What time do you open on Sunday?',
      'I need to move my booking',
      'Can I pay with KHQR?',
    ],
  },
  pricing: {
    eyebrow: 'A price you can understand',
    title: 'Free to get started',
    headline: 'You pay when your shop gets paid',
    body: 'There is no monthly fee while we set up the founding shops. We will tell you the rate before charging begins.',
    points: ['The first 100 transactions each month are free', 'No card needed to apply', 'Your shop data is yours and exportable'],
    figure: 100,
    figureUnit: 'transactions a month, free',
  },
  faq: {
    title: 'Questions shop owners ask',
    items: [
      { q: 'Does Moni speak Khmer?', a: 'Yes. Moni reads and replies in Khmer, including Khmer numerals and the way people describe time. It replies in English when a customer writes in English.' },
      { q: 'What happens when it is unsure?', a: 'It does not guess a price or an available time. It stops making promises and hands the conversation back to you.' },
      { q: 'Do customers need another app?', a: 'No. They can message through Telegram or the channel your shop connects.' },
      { q: 'Why apply instead of sign up?', a: 'We set up the first shops one at a time. We want Moni to work for your shop before we open it more widely.' },
    ],
  },
  waitlist: {
    eyebrow: 'Founding shop group',
    title: 'Build Moni with us',
    body: 'Leave your email and tell us a little about your shop. We will reply and set it up with you by hand.',
    label: 'Email',
    placeholder: 'you@example.com',
    noteLabel: 'What kind of shop is it? (optional)',
    notePlaceholder: 'For example: a café in Phnom Penh with table bookings',
    submit: 'Apply',
    submitting: 'Sending',
    okTitle: 'You are in the founding shop group',
    okBody: 'Thank you. We saved your application and will follow up by email.',
    nextSteps: ['We read about your shop', 'We reply to arrange setup', 'We send your app link when your turn is ready'],
    appLink: 'Open the owner app',
    appLinkNote: 'This link works after your account is approved.',
    privacyNotice: 'By applying, you agree that Moni may keep your email for founding-shop setup.',
    errInvalid: 'Please check that email address.',
    errGeneric: 'That did not send. Please try again.',
    errBusy: 'Please wait a moment and try again.',
  },
  footer: { privacy: 'Privacy', terms: 'Terms', contact: 'Contact Moni', rights: 'Moni' },
}

export const COPY = { km, en } satisfies Record<Locale, Copy>
