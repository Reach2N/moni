# Third-Party Notices

## 21st.dev Agent Elements

MIT License

Copyright (c) 2026 21st.dev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Beautiful UI

The Approval Card interaction pattern is adapted from [Beautiful UI](https://www.beautifului.dev/).
Beautiful UI publishes its copy-and-paste component set under the MIT License. Moni's
implementation is source-owned at `src/components/agent/approval-card.tsx`; no package,
compiled stylesheet, or remote runtime is used.

MIT License

Copyright (c) 2026 Beautiful UI / TurboProduct

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## shadcn/ui

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## simple-icons

The five channel marks in `src/components/marketing/channel-marks.tsx` are the
official brand glyphs, taken from simple-icons (https://simple-icons.org) at the
paths its maintainers verify against each company's own brand resource page.

The simple-icons ICON FILES are released under CC0 1.0 Universal:

  https://creativecommons.org/publicdomain/zero/1.0/

CC0 waives simple-icons' own copyright in the files. It does NOT and cannot
waive anyone's TRADEMARK, and simple-icons says so explicitly in its own legal
disclaimer. Telegram, Messenger, Facebook, Instagram and Grab remain the
trademarks of their respective owners.

They are used here nominatively: to name a messaging channel a shop's customers
already use, which is what trademark law permits without a licence. Each mark is
reproduced unmodified in its published brand colour, is not used as part of
Moni's own logo or wordmark, and does not imply endorsement, partnership, or
certification by any of these companies.

Brand colours and sources, as published:

  Telegram   #26A5E4  https://telegram.org/tour/screenshots
  Messenger  #0866FF  https://about.meta.com/brand/resources/facebook/messenger-icon
  Facebook   #0866FF  https://about.meta.com/brand/resources/facebook/logo
  Instagram  #FF0069  https://about.meta.com/brand/resources/instagram
  Grab       #00B14F  https://en.wikipedia.org/wiki/File:Grab_(application)_logo.svg

The five marks are presented at equal weight, and `copy.channels.platforms`
describes what Moni handles on each channel rather than a delivery order. That
is a deliberate product decision, recorded here so it is not mistaken for an
oversight: an earlier revision tiered the row with a `live` flag and
Now/Next/Planned badges, and it was removed on purpose.

What that means in practice: this page presents the full channel set, so the
place where a shop owner learns which channel they can connect on day one is the
waitlist reply and the onboarding, not this row. Keep those accurate. The
trademark position above is unaffected either way, since it rests on naming a
channel, not on claiming to be connected to it.
