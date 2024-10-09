import type { MetaFunction } from "@remix-run/node";
import Footer from "../../components/footer";
import Header from "../../components/header";
import { LixCover, LixCoverMobile } from "../../components/lixCover";

type UseCase = {
  title: string
  year: number
  link: string
}

type BlogPost = {
  title: string
  link: string
}

export const meta: MetaFunction = () => {
  return [
    { title: "Lix - Change Control System" },
    { name: "description", content: "The lix change control system allows storing, tracking, querying, and reviewing changes in different file formats, e.g. .xlsx, .sqlite, or .inlang." },
  ];
};

const useCases: Array<UseCase> = [
  {
    title: "Fink - Change Control in Translation Management Systems",
    year: 2024,
    link: "https://opral.substack.com/cp/146431448",
  },
  {
    title: "Collaborative Markdown with Lix Change Control",
    year: 2024,
    link: "https://opral.substack.com/p/collaborative-markdown-with-lix-change",
  },
]


const blogPosts: Array<BlogPost> = [
  {
    title: "July 2024 update",
    link: "https://opral.substack.com/p/july-2024-update",
  },
  {
    title: "Accelerate by years part IV - The prototype",
    link: "https://opral.substack.com/p/accelerate-by-years-iv-the-prototype",
  },
  {
    title: "Accelerate by years part III - Lix on SQLite",
    link: "https://opral.substack.com/p/accelerate-by-years-part-iii-lix",
  },
  {
    title: "Accelerate by years part II - Self-contained inlang files",
    link: "https://opral.substack.com/p/accelerate-by-years-part-ii-self",
  },
  {
    title: "Accelerate by years part I - Inlang directories as lix repositories",
    link: "https://opral.substack.com/p/accelerate-by-years-part-i-inlang",
  },
  {
    title: "June 2024 update",
    link: "https://opral.substack.com/p/june-2024-update",
  },
]

export default function Index() {
  return (
    <>
      <Header />
      <div className="w-full max-w-2xl px-4 mx-auto">
        <h1 className="w-full md:w-[55%] mt-12 mb-8 text-3xl leading-[1.3] text-slate-950 font-medium">
          <svg
            width="40"
            height="auto"
            viewBox="0 0 189 129"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M107.415 40L123.438 70.5114L163.858 0H188.688L139.404 83.6364L165.369 127.273H140.654L123.438 97.1023L106.506 127.273H81.5059L107.415 83.6364L82.4149 40H107.415Z"
              fill="#07B6D4" />
            <path d="M43.5938 127.273V40H67.7983V127.273H43.5938Z" fill="#07B6D4" />
            <path d="M24 0.261719V128.262H0V0.261719H24Z" fill="#07B6D4" />
            <path d="M44 0.261719H108V20.2617H44V0.261719Z" fill="#07B6D4" />
          </svg>
          <br />
          The world's first change control system.
        </h1>
        <p className="text-slate-600 leading-[1.7] italic pl-8 border-l-2 border-zinc-200 my-8">
          "Every work that we create, every time we collaborate, everything we automate, it revolves
          around changes. A system, that can understand changes and inform you about that this changes
          happened, means that you have a system to collaborate, validate, automate and create." -
          Samuel Stroschein, Founder of Opral (lix & inlang)
        </p>
        <p className="text-slate-600 leading-[1.7]">
          Lix provides <b className="text-slate-950 font-semibold">traceability of changes</b> for files
          stored in lix.
        </p>
        <p className="text-slate-600 leading-[1.7] mb-8">
          The lix change control system allows storing, tracking, querying, and reviewing changes in
          different file formats, e.g., .xlsx, .sqlite, or .inlang.
        </p>
        <div className="w-full hidden sm:block"><LixCover /></div>
        <div className="w-full block sm:hidden"><LixCoverMobile /></div>
        <h2 className="mt-12 mb-4 text-xl font-medium text-slate-950">Use cases</h2>
        <p className="text-slate-600 leading-[1.7]">
          We collected a ranch of case studies and small excurses into different use cases of Lix.
        </p>
        <ul className="leading-[2] pl-6 mb-8">
          {useCases.map((useCase) =>
            <li>
              <a
                className="text-slate-950 underline decoration-slate-300 font-medium hover:decoration-slate-950"
                href={useCase.link}
              >
                {useCase.title} <span className="font-mono text-slate-600 font-normal">{useCase.year}</span>
              </a>
            </li>
          )}
        </ul>
        <h2 className="mt-12 mb-4 text-xl font-medium text-slate-950">Blog posts</h2>
        <p className="text-slate-600 leading-[1.7]">
          Find the latest blog posts and updates on our
                <a
            className="text-slate-950 underline decoration-slate-300 font-medium hover:decoration-slate-950"
            href="https://opral.substack.com/"
                  target="_blank"
          >Substack</a>.
        </p>
        <ul className="leading-[2] pl-6 mb-8">
          {
            blogPosts.map((entry) =>
              <li>
                <a
                  className="text-slate-950 underline decoration-slate-300 font-medium hover:decoration-slate-950"
                  href={entry.link}
                >
                  {entry.title}
                </a>
              </li>
            )
          }
        </ul>
        <div className="border border-slate-200 rounded-lg p-7 my-16">
          <h2 className="mt-0 mb-4 text-xl font-medium text-slate-950">Lix SDK</h2>
          <p className="text-slate-600 leading-[1.7]">
            The Lix SDK allows you to build web apps with built-in change control.
          </p>
          <div
            className="mt-6 w-full text-center text-[16px] px-3 py-3 text-slate-700 font-medium rounded-lg bg-slate-100 hover:bg-slate-200 border-none cursor-none pointer-events-none"
          >
            Lix SDK<span className="bg-slate-300 rounded px-2 py-1 ml-3">Coming soon</span>
          </div>
        </div>
      </div >
      <Footer />
    </>
  );
}
