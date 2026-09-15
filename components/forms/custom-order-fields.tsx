import { ChevronDown } from "lucide-react";
import { getPresetOptions, PresetChips } from "@/components/forms/preset-chips";
import { cn } from "@/lib/utils";

/** At most six choices stay easy to scan as chips; longer lists use a select. */
const CHIP_LIMIT = 6;
export const inputClass =
	"block w-full min-h-control rounded-md border border-line-strong bg-canvas px-4 py-3 text-base text-ink transition-ui placeholder:text-muted";

export function PresetRow({
	name,
	label,
	neutralLabel,
	options,
	value,
	onChange,
}: Readonly<{
	name: string;
	label: string;
	neutralLabel: string;
	options: readonly string[];
	value: string;
	onChange: (value: string) => void;
}>) {
	const items = getPresetOptions(options, neutralLabel, value);
	if (items.length <= CHIP_LIMIT) {
		return (
			<PresetChips
				name={name}
				label={label}
				neutralLabel={neutralLabel}
				options={items}
				value={value}
				onChange={onChange}
			/>
		);
	}
	return (
		<Field id={name} label={label} optional>
			<div className="relative">
				<select
					id={name}
					name={name}
					value={value}
					onChange={(event) => onChange(event.currentTarget.value)}
					className={cn(inputClass, "appearance-none pr-11 cursor-pointer")}
				>
					<option value="">{neutralLabel}</option>
					{items.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
				<ChevronDown
					size={16}
					aria-hidden="true"
					className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
				/>
			</div>
		</Field>
	);
}

export function Field({
	id,
	label,
	optional,
	required,
	error,
	description,
	children,
}: Readonly<{
	id: string;
	label: string;
	optional?: boolean;
	required?: boolean;
	error?: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
}>) {
	let hint: React.ReactNode = null;
	if (required) {
		hint = <span className="text-xs text-muted">required</span>;
	} else if (optional) {
		hint = <span className="text-xs text-muted">optional</span>;
	}
	return (
		<div className="grid gap-(--field-label-gap)">
			<label
				htmlFor={id}
				className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm font-medium text-ink"
			>
				<span>{label}</span>
				{hint}
			</label>
			{description}
			{error}
			<div className="relative">{children}</div>
		</div>
	);
}
