import { type AnchorHTMLAttributes, forwardRef } from "react";
import { navigate } from "./mock-actions";

type Href = string | { pathname: string };

interface MockLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
	href: Href;
}

/**
 * Stands in for `next/link` so the admin nav mounts without Next. When the
 * consumer's own onClick did not preventDefault, the navigation is swallowed
 * and the mocked pathname changes the way a route change would.
 */
const MockLink = forwardRef<HTMLAnchorElement, MockLinkProps>(function MockLink(
	{ href, onClick, children, ...rest },
	ref,
) {
	const path = typeof href === "string" ? href : href.pathname;
	return (
		<a
			ref={ref}
			href={path}
			{...rest}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				event.preventDefault();
				navigate(path);
			}}
		>
			{children}
		</a>
	);
});

export default MockLink;
