import { useState } from "react";
import { Segmented } from "../../../app/admin/_components/segmented";

/** Radiogroup keyboard path for the Segmented control (1.8). */
export function SegmentedFixture() {
	const [status, setStatus] = useState("available");
	return (
		<>
			<Segmented
				name="alpha"
				label="Status of Alpha"
				value={status}
				onChange={setStatus}
				helper={status === "archive" ? "Shown in the gallery without a price" : undefined}
				options={[
					{ value: "available", label: "Available", dotClass: "bg-status-available" },
					{ value: "sold", label: "Sold", dotClass: "bg-status-sold" },
					{ value: "archive", label: "Not for sale", dotClass: "bg-status-nfs" },
				]}
			/>
			<output>{status}</output>
		</>
	);
}

/** A disabled segment surfaces its reason as the helper line (1.8). */
export function SegmentedBlockedFixture() {
	const [status, setStatus] = useState("available");
	return (
		<Segmented
			name="bravo"
			label="Status of Bravo"
			value={status}
			onChange={setStatus}
			options={[
				{ value: "available", label: "Available" },
				{ value: "sold", label: "Sold" },
				{
					value: "archive",
					label: "Not for sale",
					disabled: true,
					disabledReason: "Remove the price first.",
				},
			]}
		/>
	);
}
