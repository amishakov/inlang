import type { InlangConfig, PluginSettings } from "@inlang/config"
import { LanguageTag, TranslatedStrings } from "@inlang/language-tag"
import { Message } from "@inlang/messages"
import { Static, TSchema, Type } from "@sinclair/typebox"
import type { NodeishFilesystem as LisaNodeishFilesystem } from "@inlang-git/fs"
import type { PluginError } from "./errors.js"

type JSONSerializable<
	T extends Record<string, string | string[] | Record<string, string | string[]>> | unknown,
> = T

/**
 * The filesystem is a subset of project lisa's nodeish filesystem.
 *
 * - only uses minimally required functions to decrease the API footprint on the ecosystem.
 */
export type NodeishFilesystemSubset = Pick<
	LisaNodeishFilesystem,
	"readFile" | "readdir" | "mkdir" | "writeFile"
>

/**
 * Function that resolves (imports and initializes) the plugins.
 */
export type ResolvePluginsFunction = (args: {
	module: string
	plugins: Plugin[]
	nodeishFs: NodeishFilesystemSubset
	pluginSettings: Record<Plugin["meta"]["id"], PluginSettings>
}) => Promise<{
	data: ResolvedPlugins
	errors: Array<PluginError>
}>

/**
 * The API after resolving the plugins.
 */
export type ResolvedPlugins = {
	loadMessages: (args: { languageTags: LanguageTag[] }) => Promise<Message[]> | Message[]
	saveMessages: (args: { messages: Message[] }) => Promise<void> | void
	detectedLanguageTags?: () => Promise<string[]> | string[]
	/**
	 * App specific APIs.
	 *
	 * @example
	 *  // define
	 *  appSpecificApi: ({ options }) => ({
	 * 	 "inlang.ide-extension": {
	 * 	   messageReferenceMatcher: () => {
	 * 		 // use options
	 * 		 options.pathPattern
	 * 		return
	 * 	   }
	 * 	 }
	 *  })
	 *  // use
	 *  appSpecificApi['inlang.ide-extension'].messageReferenceMatcher()
	 */
	appSpecificApi: Record<Plugin["meta"]["id"], unknown>
	/**
	 * Metainformation for a specific plugin.
	 *
	 * @example
	 *   meta['inlang.plugin-i18next'].description['en']
	 *   meta['inlang.plugin-i18next'].module
	 */
	meta: Record<Plugin["meta"]["id"], Plugin["meta"] & { module: string }>
}

// ---------------------------- RUNTIME VALIDATION TYPES ---------------------------------------------

const PromiseLike = (T: TSchema) => Type.Union([T, Type.Promise(T)])

/**
 * The plugin API is used to extend inlang's functionality.
 */
export type Plugin<
	PluginOptions extends JSONSerializable<unknown> = Record<string, string> | unknown,
	AppSpecificApis extends Record<string, unknown> = Record<string, unknown>,
> = Omit<
	Static<typeof Plugin>,
	"loadMessages" | "saveMessages" | "detectedLanguageTags" | "addAppSpecificApi"
> & {
	meta: {
		id: Static<typeof Plugin.meta.id>
	}
	/**
	 * Load messages.
	 */
	loadMessages?: (args: {
		languageTags: Readonly<InlangConfig["languageTags"]>
		options: PluginOptions
		nodeishFs: NodeishFilesystemSubset
	}) => Promise<Message[]> | Message[]
	saveMessages?: (args: {
		messages: Message[]
		options: PluginOptions
		nodeishFs: NodeishFilesystemSubset
	}) => Promise<void> | void
	/**
	 * Detect language tags in the project.
	 *
	 * Some projects use files or another config file as the source
	 * of truth for the language tags. This function allows plugins
	 * to detect language tags of those other sources.
	 *
	 * Apps use this function to prompt the user to update their
	 * language tags in the config if additional language tags are detected.
	 */
	detectedLanguageTags?: (args: {
		nodeishFs: NodeishFilesystemSubset
		options: PluginOptions
	}) => Promise<string[]> | string[]
	/**
	 * Define app specific APIs.
	 *
	 * @example
	 * addAppSpecificApi: () => ({
	 * 	 "inlang.ide-extension": {
	 * 	   messageReferenceMatcher: () => {}
	 * 	 }
	 *  })
	 */
	addAppSpecificApi?: (args: { options: PluginOptions }) => AppSpecificApis
}
export const Plugin = Type.Object(
	{
		meta: Type.Object({
			id: Type.String({
				pattern: "^[a-z0-9-]+\\.[a-z0-9-]+$",
				examples: ["example.my-plugin"],
			}),
			displayName: TranslatedStrings,
			description: TranslatedStrings,
			keywords: Type.Array(Type.String()),
		}),
		loadMessages: Type.Optional(
			Type.Function(
				[
					Type.Object({
						languageTags: LanguageTag,
						options: Type.Union([Type.Object({}), Type.Undefined()]),
						nodeishFs: Type.Object({}),
					}),
				],
				PromiseLike(Type.Array(Message)),
			),
		),
		saveMessages: Type.Optional(
			Type.Function(
				[
					Type.Object({
						messages: Type.Array(Message),
						options: Type.Union([Type.Object({}), Type.Undefined()]),
						nodeishFs: Type.Object({}),
					}),
				],
				PromiseLike(Type.Void()),
			),
		),
		detectedLanguageTags: Type.Optional(
			Type.Function(
				[
					Type.Object({
						options: Type.Union([Type.Object({}), Type.Undefined()]),
						nodeishFs: Type.Object({}),
					}),
				],
				PromiseLike(Type.Array(Type.String())),
			),
		),
		addAppSpecificApi: Type.Optional(
			Type.Function(
				[
					Type.Object({
						options: Type.Union([Type.Object({}), Type.Undefined()]),
					}),
				],
				PromiseLike(Type.Record(Type.String(), Type.Any())),
			),
		),
	},
	{ additionalProperties: false },
)
