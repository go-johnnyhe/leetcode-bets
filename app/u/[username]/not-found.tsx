import Link from "next/link";

export default function UserNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
      <p className="text-xs italic text-zinc-500">
        <Link href="/" className="no-underline hover:underline">
          ← dashboard
        </Link>
      </p>
      <header className="pb-12 pt-6 text-center">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-zinc-100">
          not found
        </h1>
        <p className="mt-2 font-serif text-sm italic text-zinc-500">
          nobody in the group has that leetcode handle.
        </p>
      </header>
    </main>
  );
}
