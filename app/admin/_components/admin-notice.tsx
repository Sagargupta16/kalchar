import { AlertCircle, Check, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ICON_SM } from "./controls";

type NoticeVariant = "error" | "success" | "info";

const BASE = "flex items-start gap-2 rounded-(--radius-sm) border px-3 py-2 text-sm";

const STYLE: Record<NoticeVariant, string> = {
	error: "border-ruby/30 bg-ruby/5 text-ruby",
	success: "border-accent/30 bg-accent/5 text-accent-text",
	info: "border-line bg-canvas text-muted",
};

const ICON: Record<NoticeVariant, typeof AlertCircle> = {
	error: AlertCircle,
	success: Check,
	info: Info,
};

interface AdminNoticeProps {
	variant: NoticeVariant;
	children: ReactNode;
	className?: string;
	id?: string;
}

/**
 * Inline, findable status for admin CRUD. Never auto-dismisses; the caller
 * unmounts success after SAVED_BADGE_DURATION_MS (2000) and keeps errors until
 * the next attempt. Errors are role="alert", success is an <output>, info is
 * role="status". No toasts for admin CRUD (research; Apple HIG feedback).
 * mt-0.5 on the icon is a deliberate optical alignment, not a spacing step.
 */
export function AdminNotice({ variant, children, className, id }: Readonly<AdminNoticeProps>) {
	const Icon = ICON[variant];
	const icon = <Icon size={ICON_SM} aria-hidden="true" className="mt-0.5 shrink-0" />;
	const classes = cn(BASE, STYLE[variant], className);
	if (variant === "success") {
		return (
			<output id={id} className={classes}>
				{icon}
				<span className="min-w-0">{children}</span>
			</output>
		);
	}
	return (
		<p id={id} role={variant === "error" ? "alert" : "status"} className={classes}>
			{icon}
			<span className="min-w-0">{children}</span>
		</p>
	);
}
