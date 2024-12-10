import { expect, test, vi } from "vitest";
import { createServerApiHandler } from "../server-api-handler/create-server-api-handler.js";
import { createServerApiMemoryStorage } from "../server-api-handler/storage/create-memory-storage.js";
import { openLixInMemory } from "../lix/open-lix-in-memory.js";
import { pushToServer } from "./push-to-server.js";
import type { LixFile } from "../database/schema.js";
import type { Account } from "../account/database-schema.js";
import { newLixFile } from "../lix/new-lix.js";
import type { KeyValue } from "../key-value/database-schema.js";
import { mockJsonSnapshot } from "../snapshot/mock-json-snapshot.js";
import { pullFromServer } from "./pull-from-server.js";

test("push rows of multiple tables to server successfully", async () => {
	const lixBlob = await newLixFile();

	const lix = await openLixInMemory({ blob: lixBlob });

	const id = await lix.db
		.selectFrom("key_value")
		.where("key", "=", "lix_id")
		.selectAll()
		.executeTakeFirstOrThrow();

	const storage = createServerApiMemoryStorage();
	const lsaHandler = await createServerApiHandler({ storage });

	global.fetch = vi.fn((request) => lsaHandler(request));

	// initialize the lix on the server
	await lsaHandler(
		new Request("http://localhost:3000/lsa/new-v1", {
			method: "POST",
			body: await lix.toBlob(),
		})
	);

	await lix.db
		.insertInto("account")
		.values({ id: "account0", name: "some account" })
		.execute();

	// inserting into another table to test if multiple tables are pushed to server
	await lix.db
		.insertInto("key_value")
		.values({
			key: "mock-key",
			value: "mock-value",
		})
		.execute();

	// change control of own tables
	// is async atm, need to await here
	// see https://linear.app/opral/issue/LIXDK-263/sync-execution-of-queries
	await new Promise((resolve) => setTimeout(resolve, 100));

	await pushToServer({
		id: id.value,
		lix,
		serverUrl: "http://localhost:3000",
		// empty vector clock means push all rows
		targetVectorClock: [],
	});

	const lixFromServer = await openLixInMemory({
		blob: await storage.get(`lix-file-${id.value}`),
	});

	const keyValueChangesOnServer = await lixFromServer.db
		.selectFrom("change")
		.innerJoin("snapshot", "change.snapshot_id", "snapshot.id")
		.where("schema_key", "=", "lix_key_value_table")
		.where("entity_id", "=", "mock-key")
		.selectAll()
		.execute();

	const accountsChangesOnServer = await lixFromServer.db
		.selectFrom("change")
		.innerJoin("snapshot", "change.snapshot_id", "snapshot.id")
		.where("schema_key", "=", "lix_account_table")
		.where("entity_id", "=", "account0")
		.selectAll()
		.execute();

	expect(accountsChangesOnServer.map((c) => c.content)).toEqual([
		{ id: "account0", name: "some account" } satisfies Account,
	]);
	expect(keyValueChangesOnServer.map((c) => c.content)).toEqual([
		{
			key: "mock-key",
			value: "mock-value",
		},
	] satisfies KeyValue[]);
});

test("push-pull-push with two clients", async () => {
	const lixBlob = await newLixFile();

	const client1 = await openLixInMemory({ blob: lixBlob });
	const client2 = await openLixInMemory({ blob: lixBlob });

	const { value: lixId } = await client1.db
		.selectFrom("key_value")
		.where("key", "=", "lix_id")
		.selectAll()
		.executeTakeFirstOrThrow();

	const storage = createServerApiMemoryStorage();
	const lsaHandler = await createServerApiHandler({ storage });

	global.fetch = vi.fn((request) => lsaHandler(request));

	// Initialize the lix on the server
	await lsaHandler(
		new Request("http://localhost:3000/lsa/new-v1", {
			method: "POST",
			body: await client1.toBlob(),
		})
	);

	// Client 1 inserts an account locally
	await client1.db
		.insertInto("account")
		.values({ id: "account0", name: "account from client 1" })
		.execute();

	// Client 1 inserts into another table
	await client1.db
		.insertInto("key_value")
		.values({
			key: "mock-key",
			value: "mock-value from client 1",
		})
		.execute();

	// Client 1 pushes to server
	await pushToServer({
		id: lixId,
		lix: client1,
		serverUrl: "http://localhost:3000",
		targetVectorClock: [],
	});

	// Client 2 pulls from server
	const knownServerStateClient2 = await pullFromServer({
		id: lixId,
		lix: client2,
		serverUrl: "http://localhost:3000",
	});

	// expect client2 to have the same data as client1
	// after pulling from the server
	const client2AccountAfterPull = await client2.db
		.selectFrom("account")
		.selectAll()
		.execute();

	const client2KeyValueAfterPull = await client2.db
		.selectFrom("key_value")
		.selectAll()
		.execute();

	expect(client2AccountAfterPull).toEqual(
		expect.arrayContaining([
			{ id: "account0", name: "account from client 1" } satisfies Account,
		])
	);

	expect(client2KeyValueAfterPull).toEqual(
		expect.arrayContaining([
			{
				key: "mock-key",
				value: "mock-value from client 1",
			} satisfies KeyValue,
		])
	);

	// Client 2 inserts an account locally
	await client2.db
		.insertInto("account")
		.values({ id: "account1", name: "account from client 2" })
		.execute();

	// Client 2 inserts into another table
	await client2.db
		.insertInto("key_value")
		.values({
			key: "mock-key-2",
			value: "mock-value from client 2",
		})
		.execute();

	await client2.db
		.updateTable("key_value")
		.set({
			value: "mock-value from client 1 - updated by client 2",
		})
		.where("key", "=", "mock-key")
		.execute();

	// Client 2 pushes to server
	await pushToServer({
		id: lixId,
		lix: client2,
		serverUrl: "http://localhost:3000",
		targetVectorClock: knownServerStateClient2,
	});

	// Verify the data on the server
	const lixFromServer = await openLixInMemory({
		blob: await storage.get(`lix-file-${lixId}`),
	});

	const accountsChangesOnServer = await lixFromServer.db
		.selectFrom("change")
		.innerJoin("snapshot", "change.snapshot_id", "snapshot.id")
		.where("schema_key", "=", "lix_account_table")
		.selectAll()
		.execute();

	expect(accountsChangesOnServer.map((c) => c.content)).toEqual(
		expect.arrayContaining([
			{ id: "account0", name: "account from client 1" },
			{ id: "account1", name: "account from client 2" },
		])
	);

	await pullFromServer({
		id: lixId,
		lix: client1,
		serverUrl: "http://localhost:3000",
	});

	const accountChangesOnClient1 = await client1.db
		.selectFrom("change")
		.innerJoin("snapshot", "change.snapshot_id", "snapshot.id")
		.where("schema_key", "=", "lix_account_table")
		.selectAll()
		.execute();

	// TODO @samuel  - this seem to be broken because of asynchronous change managment ? how shall we test this?
	expect(accountsChangesOnServer).toEqual(accountChangesOnClient1);

	await pullFromServer({
		id: lixId,
		lix: client2,
		serverUrl: "http://localhost:3000",
	});

	const accountChangesOnClient2 = await client2.db
		.selectFrom("change")
		.innerJoin("snapshot", "change.snapshot_id", "snapshot.id")
		.where("schema_key", "=", "lix_account_table")
		.selectAll()
		.execute();

	expect(accountsChangesOnServer).toEqual(accountChangesOnClient2);

	const keyValueChangesOnServer = await lixFromServer.db
		.selectFrom("change")
		.innerJoin("snapshot", "change.snapshot_id", "snapshot.id")
		.where("schema_key", "=", "lix_key_value_table")
		.selectAll()
		.execute();

	expect(keyValueChangesOnServer.map((c) => c.content)).toEqual(
		expect.arrayContaining([
			{
				key: "mock-key",
				value: "mock-value from client 1",
			},
			{
				key: "mock-key",
				value: "mock-value from client 1 - updated by client 2",
			},
			{ key: "mock-key-2", value: "mock-value from client 2" },
		])
	);
});

test("it should handle snapshots.content json binaries", async () => {
	const lix = await openLixInMemory({});

	const { value: id } = await lix.db
		.selectFrom("key_value")
		.where("key", "=", "lix_id")
		.selectAll()
		.executeTakeFirstOrThrow();

	const storage = createServerApiMemoryStorage();
	const lsaHandler = await createServerApiHandler({ storage });

	global.fetch = vi.fn((request) => lsaHandler(request));

	// initialize the lix on the server
	await lsaHandler(
		new Request("http://localhost:3000/lsa/new-v1", {
			method: "POST",
			body: await lix.toBlob(),
		})
	);

	const mockSnapshot = mockJsonSnapshot({
		location: "Berlin",
	});

	// insert a snapshot
	await lix.db
		.insertInto("snapshot")
		.values({
			content: mockSnapshot.content,
		})
		.execute();

	await pushToServer({
		id,
		lix,
		serverUrl: "http://localhost:3000",
		targetVectorClock: [],
	});

	const lixFromServer = await openLixInMemory({
		blob: await storage.get(`lix-file-${id}`),
	});

	const snapshot = await lixFromServer.db
		.selectFrom("snapshot")
		.where("id", "=", mockSnapshot.id)
		.selectAll()
		.executeTakeFirst();

	expect(snapshot).toMatchObject(mockSnapshot);
});

test.todo("it should handle binary values", async () => {
	const lixBlob = await newLixFile();

	const lix = await openLixInMemory({ blob: lixBlob });

	const { value: id } = await lix.db
		.selectFrom("key_value")
		.where("key", "=", "lix_id")
		.selectAll()
		.executeTakeFirstOrThrow();

	const storage = createServerApiMemoryStorage();
	const lsaHandler = await createServerApiHandler({ storage });

	global.fetch = vi.fn((request) => lsaHandler(request));

	// initialize the lix on the server
	await lsaHandler(
		new Request("http://localhost:3000/lsa/new", {
			method: "POST",
			body: await lix.toBlob(),
		})
	);

	// inserting file with binary data
	await lix.db
		.insertInto("file")
		.values({
			id: "file0",
			path: "/hello.txt",
			data: new TextEncoder().encode("Hello, World!"),
		})
		.execute();

	await pushToServer({
		id,
		lix,
		serverUrl: "http://localhost:3000",
		targetVectorClock: [], // initial push - server has no state
	});

	const lixFromServer = await openLixInMemory({
		blob: await storage.get(`lix-file-${id}`),
	});

	const filesOnServer = await lixFromServer.db
		.selectFrom("file")
		.where("id", "=", "file0")
		.selectAll()
		.execute();

	expect(filesOnServer).toEqual([
		{
			id: "file0",
			path: "/hello.txt",
			metadata: null,
			data: new TextEncoder().encode("Hello, World!"),
		} satisfies LixFile,
	]);
});
