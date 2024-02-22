import * as m from "@/paraglide/messages.js"
import { languageTag } from "@/paraglide/runtime"
import { ClientComponent } from "./ClientComponent"
import { Link } from "@inlang/paraglide-js-adapter-next"

export default function Home() {
	return (
		<main>
			<p>{m.greeting({ name: "Samuel", count: 5 })}</p>
			<p>{m.currentLanguageTag({ languageTag: languageTag() })}</p>

			<Link href="/about">{m.about()}</Link>
			<br />

			<Link href="/form">Form Flow</Link>
			<br />

			<Link href="/form" locale="enasdf">
				Form Flow (en)
			</Link>
			<br />
			<ClientComponent />
		</main>
	)
}
