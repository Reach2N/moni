# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the owner of a small service business in Cambodia. Salon, barber, clinic,
dental, moto or car repair, guesthouse, tailor, phone repair, tutoring centre, karaoke
room. She is not technical, has never used business software, and runs the shop with her
hands busy. She checks her phone between customers, often standing, frequently outdoors
in bright daylight, on a low cost Android handset. Her job when she opens the app is to
see who is coming, whether they paid, and what needs her attention.

Secondary: her customers. They never install anything and never see this interface. They
reach the business through Telegram, Facebook Messenger, Instagram, or a public link, and
they talk in ordinary language.

## Product Purpose

The owner describes her shop once, in plain language, by typing or by speaking, in Khmer
or English or both mixed together. From that paragraph Moni builds an assistant that
answers her customers, books appointments into a real calendar, and collects payment by
KHQR. She gets back the hours she currently spends replying to messages, and she stops
losing the customers who message while she is working and go elsewhere before she reads it.

Success is that a shop owner stops keeping her bookings in a notebook and an unread inbox.

## Positioning

The existing tools sell a builder. ManyChat and Chatfuel require the owner to draw a
conversation flow in a visual editor, which is a second job for someone whose hands are
already busy, and those flows break the moment a customer says something unanticipated.
Moni's mechanism is that one paragraph of plain language is the entire configuration.
There is no flow to draw, nothing to map, and the customer installs nothing.

The honest incumbent is not software. It is a paper notebook and a Messenger inbox with
forty unread messages.

## Operating Context

- The owner works with her hands and reads her phone in short gaps, standing, often in
  direct sun. Reading conditions are hostile and are part of the design problem.
- Customers arrive through Telegram, Messenger, Instagram, or a shared link. Messenger is
  the larger channel in Cambodia. Telegram is the fastest to connect because BotFather
  needs no platform review, so it ships first for build speed, not reach.
- Money is quoted in riel and dollars, sometimes in the same sentence. KHR carries no
  decimal places, USD carries two.
- Payment is KHQR, scanned from the customer's own banking app. Bakong's transaction check
  refuses calls from servers outside Cambodia. CutLuy, the wrapper already in use on the
  owner's other project, settles USD only.
- Khmer script has no spaces between words and stacks subscript consonants below the
  baseline, so it breaks layouts built for Latin text.

## Capabilities and Constraints

- Booking is modelled as a time range against a resource, so one mechanism covers a
  30 minute haircut, an hourly repair bay, a day long tailoring job, and a two night
  guesthouse stay. Double booking is prevented by the database, not by application code.
- 42 Cambodian business types are supported. The taxonomy lives in TypeScript, not in
  database enums, so adding a vertical needs no migration.
- The assistant has two separate tool sets. The customer facing one can read the
  catalogue, book, and take payment. Only the owner facing one can change the catalogue.
- Free tier is 100 transactions per month, where a transaction is a booking that reached
  confirmed or completed plus any standalone paid sale. Paid tiers are proposed and not
  yet confirmed.
- Voice input is planned as transcription to text. The stored message is always the
  transcript, so nothing downstream depends on audio.
- The interface opens in Khmer, with English available.
- Hard deadline: a programme application due 20 August 2026.

## Brand Commitments

- Name: Moni. Domain: monikhmer.com.
- Palette pinned by the owner: primary #0F172A, secondary #475569, tertiary #059669,
  neutral #F8FAFC.
- Typeface: Futura 100 Khmer, by TypeTogether, Khmer script by Sovichet Tep. It is
  licensed for web use only through an Adobe Fonts web project. Its EULA forbids
  converting it to a web font format, so it must never be self hosted. Kantumruy Pro and
  Busra, both OFL, are the self hosted fallbacks.
- No em dashes in any user facing text, marketing copy, or model output.
- Khmer text needs a line height of at least 1.75.

## Evidence on Hand

- There are no real users, no pilots, no waitlist, no revenue, and no testimonials. Every
  name, booking, price and conversation currently on screen is fictional seed data for two
  invented businesses, Sokha Beauty in Takeo and Angkor Rest Guesthouse in Siem Reap.
  None of it may be presented as real, and no customer count, rating, or quote may be
  invented anywhere in the interface.
- The owner can photograph a real Cambodian shop before filming the demo. That imagery does
  not exist yet, so the design must hold up with none and improve with some.
- The owner runs a real ecommerce operation with a working KHQR payment integration. That
  is genuine experience but belongs to a different product and cannot be shown as Moni's
  traction.

## Product Principles

1. One paragraph is the whole configuration. Any feature that asks the owner to build,
   map, or configure something has failed the premise.
2. The customer installs nothing and learns nothing.
3. The database is the only source of truth for anything the assistant promises. It never
   states a price or an available time from memory.
4. When the assistant is not certain, it stops and hands the conversation to the owner.
   The handoff is a feature, not an error path.
5. Money is never approximated, and the owner can always see exactly what was charged and
   what the assistant said in her name.

## Accessibility & Inclusion

- WCAG AA for text contrast, and 3:1 for the boundaries of interactive components.
- Khmer requires a minimum line height of 1.75 so coeng subscripts are not clipped.
- The primary reading condition is bright outdoor daylight on a low cost LCD phone screen.
  Legibility outranks atmosphere in every conflict.
- Users are non technical and may not read English. Icons carry text labels, and no meaning
  is conveyed by colour alone.
