import { socialLinks } from "./header";
import IconCopyright from "./icons/copyright";
import IconSubstack from "./icons/substack";

export const Footer = () => {
  return (
    <>
      <footer className="mt-12 mb-4 w-full max-w-5xl px-4 py-3 mx-auto flex flex-col gap-4">
        <div className="bg-slate-100 p-6 rounded-lg flex justify-between items-center gap-4">
          <p className="flex flex-col gap-0.5 text-slate-800">
            <span className="font-semibold">Stay in the loop!</span>
            Get regular updates and be the first who can use Lix.
          </p>
          <a
            href="https://opral.substack.com/"
            target="_blanc"
            className="px-4 py-2 text-white bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold flex items-center gap-2"
          >
            <IconSubstack />
            Subscribe
          </a>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex gap-0.5 items-center text-slate-900 font-semibold">
              <IconCopyright />
              Lix by Opral
            </div>
            <a
              href="https://opral.substack.com"
              target="_blank"
              className="px-2 py-1 text-slate-500 hover:text-cyan-600 bg-white"
            >
              Blog
            </a>
          </div>

          <div className="flex items-center gap-2">
            {socialLinks.map((socialLink, index) => (
              <a
                key={index}
                className="p-2 text-slate-500 hover:text-cyan-600"
                href={socialLink.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {socialLink.text}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer;