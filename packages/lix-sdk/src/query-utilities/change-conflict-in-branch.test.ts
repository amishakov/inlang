import { test, expect } from "vitest";
import { openLixInMemory } from "../lix/open-lix-in-memory.js";
import { createChangeConflict } from "../change-conflict/create-change-conflict.js";
import { changeConflictInBranch } from "./change-conflict-in-branch.js";
import { createBranch } from "../branch/create-branch.js";

test("should find conflicts in the given branch", async () => {
	const lix = await openLixInMemory({});

	// Insert changes
	await lix.db
		.insertInto("change")
		.values([
			{
				id: "change0",
				plugin_key: "mock-plugin",
				schema_key: "mock",
				file_id: "mock",
				entity_id: "value0",
				snapshot_id: "no-content",
			},
			{
				id: "change1",
				plugin_key: "mock-plugin",
				schema_key: "mock",
				file_id: "mock",
				entity_id: "value1",
				snapshot_id: "no-content",
			},
		])
		.execute();

	const branch0 = await createBranch({ lix, name: "branch0" });

	const branch1 = await createBranch({ lix, name: "branch1" });

	// Create change conflicts
	const mockConflict0 = await createChangeConflict({
		lix,
		branch: branch0,
		key: "mock-conflict0",
		conflictingChangeIds: new Set(["change0", "change1"]),
	});

	// conflict in another branch that should not be returned
	await createChangeConflict({
		lix,
		branch: branch1,
		key: "mock-conflict1",
		conflictingChangeIds: new Set(["change0"]),
	});

	// Query conflicts in the branch
	const conflictsInBranch = await lix.db
		.selectFrom("change_conflict")
		.where(changeConflictInBranch(branch0))
		.selectAll()
		.execute();

	expect(conflictsInBranch.length).toBe(1);
	expect(conflictsInBranch[0]?.id).toBe(mockConflict0.id);
});
