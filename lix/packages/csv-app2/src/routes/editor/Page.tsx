import { SlButton } from "@shoelace-style/shoelace/dist/react";
import Layout from "../../layout.tsx";
import { useAtom } from "jotai";
import { authorNameAtom, csvDataAtom, projectAtom } from "../../state.ts";
import TableEditor from "../../components/TableEditor.tsx";
import { useEffect, useState } from "react";
import { UserAuthDialog } from "../../components/UserAuthDialog.tsx";
import NoDataView from "../../components/NoData.tsx";

export default function App() {
	// const [pendingChanges] = useAtom(pendingChangesAtom);
	const [csvData] = useAtom(csvDataAtom);
	// const [commits] = useAtom(commitsAtom);
	const [authorName] = useAtom(authorNameAtom);
	const [project] = useAtom(projectAtom);

	const [showAuthorDialog, setShowAuthorDialog] = useState(false);

	const addDemoCSV = async () => {
		// get csv content from demo.csv file
		const csvContent = await fetch("./../../../demo/demo.csv").then((res) =>
			res.text()
		);

		if (project) {
			await project.db
				.insertInto("file")
				.values([
					{
						id: "demo",
						path: "/data.csv",
						data: await new Blob([csvContent]).arrayBuffer(),
					},
				])
				.execute();
		}
	};

	const handleCommit = async () => {
		await project?.commit({
			description: "Test commit",
		});
	};

	useEffect(() => {
		console.log("set", authorName);
		if (authorName) {
			project?.currentAuthor.set(authorName);
		}
	}, [authorName, project, project?.currentAuthor]);

	useEffect(() => {
		console.log("author", project?.currentAuthor.get(), authorName);
		if (!authorName && project) {
			setShowAuthorDialog(true);
		}
	}, [authorName, project]);

	return (
		<>
			<Layout>
				{csvData && csvData.length > 0 ? <TableEditor /> : <NoDataView />}
				<div className="absolute bottom-4 left-4">
					<SlButton onClick={() => addDemoCSV()}>Add Demo CSV</SlButton>
					<SlButton onClick={() => handleCommit()}>Commit</SlButton>
				</div>
			</Layout>
			<UserAuthDialog
				showAuthorDialog={showAuthorDialog}
				setShowAuthorDialog={setShowAuthorDialog}
			/>
		</>
	);
}
