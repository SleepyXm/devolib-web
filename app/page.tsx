import LandingPage from "./components/units/gasptest";

export default function Home() {
  return (
    <>
    <div className="scroll-smooth">
    <div className="flex min-h-screen items-center justify-center text-white">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start lg:max-w-7xl">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
            DevoLib
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Hit{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-200"
            >
              Let's get started
            </a>{" "}
            or check out the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-200"
            >
              Previews
            </a>{" "}
          </p>
        </div>
        <div className="inline-block">to learn more about Next.js.
              
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full
              bg-gradient-to-b from-orange-200 to-red-300
              px-5 text-black transition-colors duration-700
              hover:from-orange-300 hover:to-red-300
              md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >

            Let's get started
          </a>
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full
              bg-gradient-to-r from-green-100 to-blue-300
              px-5 text-black transition-colors duration-700
              hover:from-green-200 hover:to-blue-400
              md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Previews
          </a>
        </div>
      </main>
    </div>
    <div className="w-full bg-black dark:bg-gradient-to-r from-yellow-100 to-red-300 text-zinc-300 dark:text-zinc-600">
        <h1 className="text-7xl p-4 flex flex-col justify-items-center">
          Stuff to be added: Extra Space for the landing page
        </h1>
      </div>
      <LandingPage />
      </div>
    </>
  );
}
