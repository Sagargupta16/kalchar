"use client";

import { ADMIN_NAV_GROUPS, useIsActive } from "./admin-nav-shared";

/** Desktop header crumb: "Group / Page" for the current admin route. */
export function AdminCrumb() {
	const isActive = useIsActive();
	const group = ADMIN_NAV_GROUPS.find((entry) => entry.items.some((item) => isActive(item.href)));
	const page = group?.items.find((item) => isActive(item.href));
	if (!group || !page) return null;
	return (
		<p className="flex min-w-0 items-center gap-2 text-sm">
			{/* "Enquiries / Enquiries" says nothing twice: the group shows only when it adds a word. */}
			{group.label === page.label ? null : (
				<>
					<span className="text-muted">{group.label}</span>
					<span aria-hidden="true" className="text-line-strong">
						/
					</span>
				</>
			)}
			<span className="truncate font-medium text-ink">{page.label}</span>
		</p>
	);
}
