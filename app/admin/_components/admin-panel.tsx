import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import { adminHelp, adminPanel, adminPanelInset, adminSectionTitle } from "./controls";

interface AdminPanelHeaderProps {
	id?: string;
	title: string;
	description?: ReactNode;
	/** Right-aligned control(s), e.g. a "View all" link or a Save button. */
	action?: ReactNode;
	as?: "h2" | "h3";
}

export function AdminPanelHeader({
	id,
	title,
	description,
	action,
	as: Heading = "h2",
}: Readonly<AdminPanelHeaderProps>) {
	return (
		<div className="mb-4 flex items-start justify-between gap-3">
			<div className="min-w-0">
				<Heading id={id} className={adminSectionTitle}>
					{title}
				</Heading>
				{description ? <p className={cn(adminHelp, "mt-1 text-pretty")}>{description}</p> : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}

interface AdminPanelProps {
	title?: string;
	description?: ReactNode;
	action?: ReactNode;
	/** surface = panel on the canvas (default); inset = create form nested inside a panel. */
	variant?: "surface" | "inset";
	as?: "section" | "div";
	headingAs?: "h2" | "h3";
	id?: string;
	className?: string;
	children: ReactNode;
}

/**
 * The one admin panel: border-only depth (dense tool, no shadow), padding from
 * --card-pad, heading wired to aria-labelledby. Create forms that need a
 * <form> root use the adminPanelInset string with a nested AdminPanelHeader.
 */
export function AdminPanel({
	title,
	description,
	action,
	variant = "surface",
	as: Tag = "section",
	headingAs = "h2",
	id,
	className,
	children,
}: Readonly<AdminPanelProps>) {
	const headingId = useId();
	return (
		<Tag
			id={id}
			aria-labelledby={title ? headingId : undefined}
			className={cn(variant === "inset" ? adminPanelInset : adminPanel, className)}
		>
			{title ? (
				<AdminPanelHeader
					id={headingId}
					title={title}
					description={description}
					action={action}
					as={headingAs}
				/>
			) : null}
			{children}
		</Tag>
	);
}
