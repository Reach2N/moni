# Khmer copy written or changed by the onboarding pass

I cannot verify Khmer. Please check these, especially the warning messages in
sanity.ts, which are new and are what a shop owner reads when Moni is unsure
about a price. The rest are pre-existing or short labels.

## src/lib/ai/sanity.ts

- `${amount} ទាបពេក ប្រហែលជាដុល្លារត្រូវបានយល់ច្រឡំជារៀល`
- `${amount} ខ្ពស់ពេក ប្រហែលជារៀលត្រូវបានយល់ច្រឡំជាដុល្លារ`
- `កំណត់តម្លៃជា ${currencyLabel(asCurrencyCode(s.currency))} ប៉ុន្តែរូបិយប័ណ្ណលំនាំដើមរបស់ហាងគឺ ${currencyLabel(asCurrencyCode(shop.default_currency))}`
- `រយៈពេល ${durationKm(s.duration_min)} លើសពីមួយថ្ងៃ ប៉ុន្តែសេវានេះជាកក់ម្តងៗ (session)`
- `ម៉ោងបើក ${toKhmerDigits(h.open)} ក្រោយម៉ោងបិទ ${toKhmerDigits(h.close)}`
- `ថ្ងៃដដែលកើតឡើងច្រើនជាងម្តងក្នុងបញ្ជីម៉ោងបើក`

## src/components/app/shop-setup.tsx

- `កាត់សក់ 15000៛ 30 នាទី។ លាបសក់ 45000៛ ១ម៉ោងកន្លះ។ សក់អ៊ុត 60000៛ ២ម៉ោង។ លាងសក់ 8000៛។ Open 8am to 7pm, Monday to Saturday. Closed Sunday. Two staff.`
- `ផ្ញើពិពណ៌នាទៅ Moni`
- `រៀបចំសេវា តម្លៃ និងម៉ោង`
- `Moni មិនអាចអានព័ត៌មានហាងបាន។ ទិន្នន័យហាងមិនបានប្តូរទេ។`
- `មិនអាចបញ្ជាក់ថាបានរក្សាទុកទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកម្តងទៀត។`
- `ជូនប្រូម៉ូសិនថ្ងៃសុក្រជានិច្ច។`
- `រក្សាទុកព័ត៌មានហាង`
- `Moni នឹងឆ្លើយអតិថិជនតាមតម្លៃ និងម៉ោងខាងលើ។`
- `រក្សាទុកសេវា និងម៉ោងទៅក្នុងហាង`
- `សេវា`
- `រូបិយប័ណ្ណ`
- `កំពុងរក្សាទុក`
- `រក្សាទុក`
- `មិនទាន់`
- `ប្រាប់ Moni ពីហាងរបស់អ្នក៖ សេវា តម្លៃ ម៉ោងបើក`
- `រៀបចំឱ្យខ្ញុំ`
- `ពិពណ៌នាហាងជាភាសាធម្មតា`
- `កំពុងអាន`
- `អានរួចរាល់`

---

# Added 2 September 2026: the incomplete-description pass

An owner who types an intent rather than a description ("I want to open a coffee
shop") used to get a hard error. They now get the review screen with these
strings asking for what is missing, so these are the words a founding shop reads
at the exact moment they could give up. Please check them.

## src/lib/ai/sanity.ts

- `មិនទាន់មានសេវា។ ប្រាប់ខ្ញុំពីសេវា និងតម្លៃ មុនពេលរក្សាទុក`
- `មិនទាន់មានម៉ោងបើក។ Moni នឹងមិនប្រាប់អតិថិជនពីម៉ោងទេ`

## src/components/app/shop-setup.tsx

- `ឈ្មោះហាង`
- `ឈ្មោះដែលអតិថិជនស្គាល់ហាងរបស់អ្នក` (placeholder)
- `បន្ថែមសេវា`
- `លុប`
- `Moni មិនឃើញសេវាណាមួយក្នុងពិពណ៌នារបស់អ្នកទេ។ បន្ថែមមួយខាងក្រោម ឬត្រឡប់ទៅកែពិពណ៌នា។`
- `មិនទាន់អាចរក្សាទុកបានទេ`
- `បន្ថែមសេវាយ៉ាងតិចមួយ មុនពេលរក្សាទុក`
- `សេវាខ្លះមិនទាន់មានឈ្មោះ`
- `សេវាខ្លះមិនទាន់មានតម្លៃ`
- `ពិពណ៌នាខ្លីពេក។ ប្រាប់សេវាមួយ និងតម្លៃរបស់វា ជាការចាប់ផ្តើម។`
- `បំពេញឧទាហរណ៍ហាងកាត់សក់`
- `នេះជាឧទាហរណ៍ មិនមែនហាងរបស់អ្នកទេ។ កែវាឱ្យត្រូវនឹងហាងរបស់អ្នក មុនចុច "រៀបចំឱ្យខ្ញុំ"។`

## src/lib/agent/categories.ts

Replaced the two operate chips that carried the seed fixtures' booking codes.
The pair below is what an owner with no booking yet sees; with a booking, the
chips become `<their own code> បានមកហើយ` and `<their own code> មិនបានមក`.

- `ថ្ងៃនេះមានការកក់ប៉ុន្មាន?`
- `ផ្តល់បញ្ជីអតិថិជន` (pre-existing)
