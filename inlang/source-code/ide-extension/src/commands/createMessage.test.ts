import { describe, it, beforeEach, afterEach, vi, expect } from "vitest"
import { createMessageCommand } from "./createMessage.js"
import { state } from "../utilities/state.js"
import { msg } from "../utilities/messages/msg.js"
import { window } from "vscode"
import { telemetry } from "../services/telemetry/index.js"
import { CONFIGURATION } from "../configuration.js"
import { getSetting } from "../utilities/settings/index.js"
import { generateBundleId } from "@inlang/sdk2"

vi.mock("vscode", () => ({
	commands: {
		registerCommand: vi.fn(),
	},
	window: {
		showInputBox: vi.fn(),
		showErrorMessage: vi.fn(),
	},
}))

vi.mock("../utilities/state", () => ({
	state: vi.fn(),
}))

vi.mock("../utilities/messages/msg", () => ({
	msg: vi.fn(),
}))

vi.mock("../services/telemetry/index", () => ({
	telemetry: {
		capture: vi.fn(),
	},
}))

vi.mock("../configuration", () => ({
	CONFIGURATION: {
		EVENTS: {
			ON_DID_CREATE_MESSAGE: {
				fire: vi.fn(),
			},
		},
	},
}))

vi.mock("../utilities/settings/index", () => ({
	getSetting: vi.fn(),
}))

vi.mock("@inlang/sdk2", () => ({
	createMessage: vi.fn(),
	generateBundleId: vi.fn(() => "randomBundleId123"),
}))

describe("createMessageCommand", () => {
	const mockState = {
		project: {
			settings: vi.fn().mockReturnThis(),
			db: {
				insertInto: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				execute: vi.fn(),
			},
		},
	}

	beforeEach(() => {
		vi.resetAllMocks()
		// @ts-expect-error
		state.mockReturnValue(mockState)

		// Mock getSetting only for this test
		vi.mocked(getSetting).mockResolvedValueOnce(true)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should warn if baseLocale is undefined", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: undefined })

		await createMessageCommand.callback()

		expect(msg).toHaveBeenCalledWith(
			"The `baseLocale` is not defined in the project but required to create a message.",
			"warn",
			"notification"
		)
	})

	it("should return if message content input is cancelled", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: "en" })
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce(undefined)

		await createMessageCommand.callback()

		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the message content:",
		})
		expect(msg).not.toHaveBeenCalled()
	})

	it("should return if message ID input is cancelled", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: "en" })
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Message content")
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce(undefined)

		await createMessageCommand.callback()

		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the message content:",
		})
		expect(msg).not.toHaveBeenCalled()
	})

	it("should show error message if message creation fails", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: "en" })
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Message content")
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("messageId")
		mockState.project.db.execute.mockResolvedValueOnce(false)

		await createMessageCommand.callback()

		expect(window.showErrorMessage).toHaveBeenCalledWith(
			"Couldn't upsert new message with id messageId."
		)
	})

	it("should create message and show success message", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: "en" })
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Message content")
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("messageId")
		mockState.project.db.execute.mockResolvedValueOnce(true)

		await createMessageCommand.callback()

		expect(mockState.project.db.insertInto).toHaveBeenCalledWith("message")
		expect(mockState.project.db.values).toHaveBeenCalledWith({
			id: expect.any(String),
			bundleId: expect.any(String),
			locale: "en",
			declarations: expect.any(Array),
			selectors: expect.any(Array),
		})
		expect(CONFIGURATION.EVENTS.ON_DID_CREATE_MESSAGE.fire).toHaveBeenCalled()
		expect(telemetry.capture).toHaveBeenCalledWith({
			event: "IDE-EXTENSION command executed: Create Message",
		})
		expect(msg).toHaveBeenCalledWith("Message created.")
	})

	it("should use generateBundleId as default messageId if autoHumanId is true", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: "en" })
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Message content")
		// @ts-expect-error
		getSetting.mockResolvedValueOnce(true)
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("randomBundleId123")

		await createMessageCommand.callback()

		expect(generateBundleId).toHaveBeenCalled()
		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the message content:",
		})
	})

	it("should not use generateBundleId as default messageId if autoHumanId is false", async () => {
		mockState.project.settings.mockReturnValueOnce({ baseLocale: "en" })
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Message content")
		// @ts-expect-error
		getSetting.mockResolvedValueOnce(false)
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("")

		await createMessageCommand.callback()

		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the message content:",
		})
	})
})
