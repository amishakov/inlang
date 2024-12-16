/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from "node:fs/promises"

import { createUnplugin, type UnpluginFactory } from "unplugin"
import { Message, ProjectSettings, loadProject, type InlangProject } from "@inlang/sdk"
import { openRepository, findRepoRoot } from "@lix-js/client"
import { compile, writeOutput, classifyProjectErrors } from "@inlang/paraglide-js/internal"

import { type UserConfig, resolveConfig } from "./config.js"
import { generateDTSFiles } from "./dts.js"
import { makeArray } from "./utils.js"
import { memoized } from "./memo.js"

// Helper Plugins
import { virtualModules } from "./virtual.js"

const PLUGIN_NAME = "unplugin-paraglide"

const plugin: UnpluginFactory<UserConfig> = (userConfig, ctx) => {
	const c = resolveConfig(userConfig)

	//Keep track of how many times we've compiled
	let numCompiles = 0
	let virtualModuleOutput: Record<string, string> = {}

	const triggerCompile = memoized(async function (
		messages: readonly Message[],
		settings: ProjectSettings,
		projectId: string | undefined
	) {
		if (messages.length === 0) {
			c.logger.warn("No messages found - Skipping compilation")
			return
		}

		logMessageChange()
		const [regularOutput, messageModulesOutput] = await Promise.all([
			compile({ messages, settings, outputStructure: "regular", projectId }),
			compile({ messages, settings, outputStructure: "message-modules", projectId }),
		])

		virtualModuleOutput = messageModulesOutput

		const dtsFiles = c.useVirtualModules ? generateDTSFiles(regularOutput) : undefined

		const virtualModuleFiles = c.useVirtualModules
			? // only emit the runtime.d.ts and messages.d.ts files to declutter the output directory
			  {
					"runtime.d.ts": dtsFiles!["runtime.d.ts"]!,
					"messages.d.ts": dtsFiles!["messages.d.ts"]!,
			  }
			: undefined

		const files = c.useVirtualModules ? virtualModuleFiles! : regularOutput
		await writeOutput(c.outdir, files, fs)

		numCompiles++
	})

	function logMessageChange() {
		if (!c.logger) return
		if (numCompiles === 0) c.logger.info(`Compiling Messages${c.outdir ? `into ${c.outdir}` : ""}`)
		else if (numCompiles >= 1)
			c.logger.info(`Messages changed - Recompiling${c.outdir ? `into ${c.outdir}` : ""}`)
	}

	let project: InlangProject | undefined = undefined
	async function getProject(): Promise<InlangProject> {
		if (project) return project
		const repoRoot = await findRepoRoot({ nodeishFs: fs, path: c.projectPath })
		const repo = await openRepository(repoRoot || "file://" + process.cwd(), {
			nodeishFs: fs,
		})

		project = await loadProject({
			appId: "library.inlang.paraglideJs",
			projectPath: c.projectPath,
			repo,
		})

		return project
	}

	/**
	 * Returns the paraglide module at the given path:
	 * @example
	 * ```
	 * getModule("runtime.js")
	 * getModule("messages/en.js")
	 * ```
	 */
	function getModule(path: string): string | undefined {
		if (path in virtualModuleOutput) return virtualModuleOutput[path]
		if (path.endsWith(".js")) return // it simply doesn't exist.

		return getModule(path + ".js") || getModule(path + "/index.js")
	}

	return [
		{
			name: PLUGIN_NAME,
			enforce: "pre",
			async buildStart() {
				const project = await getProject()
				const initialMessages = project.query.messages.getAll()
				const settings = project.settings()

				await triggerCompile(initialMessages, settings, project.id)

				project.errors.subscribe((errors) => {
					if (errors.length === 0) return

					const { fatalErrors, nonFatalErrors } = classifyProjectErrors(errors)
					for (const error of nonFatalErrors) {
						c.logger.warn(error.message)
					}

					for (const error of fatalErrors) {
						if (error instanceof Error) {
							c.logger.error(error.message) // hide the stack trace
						} else {
							c.logger.error(error)
						}
					}
				})

				let numInvocations = 0
				project.query.messages.getAll.subscribe((messages) => {
					numInvocations++
					if (numInvocations === 1) return // skip writing the first time, since we just called compile
					triggerCompile(messages, project.settings(), project.id)
				})
			},

			webpack(compiler) {
				//we need the compiler to run before the build so that the message-modules will be present
				//In the other bundlers `buildStart` already runs before the build. In webpack it's a race condition
				compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
					const project = await getProject()
					await triggerCompile(project.query.messages.getAll(), project.settings(), project.id)
				})
			},
		},
		...makeArray(
			virtualModules(
				{
					outdir: c.outdir,
					getModule,
					buildOnly: !c.useVirtualModules,
				},
				ctx
			)
		),
	]
}

export const paraglide = createUnplugin(plugin)
export type { UserConfig }
