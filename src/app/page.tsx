import { redirect } from 'next/navigation'

// Owner app first, per the confirmed brief. The marketing surface is a separate
// Persuade build and does not exist yet.
export default function Home() {
  redirect('/app')
}
