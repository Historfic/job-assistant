import { redirect } from 'next/navigation';

// Root route — always redirect to login.
// The login page checks localStorage for an existing session
// and skips to /dashboard if one exists.
export default function Home() {
  redirect('/login');
}
