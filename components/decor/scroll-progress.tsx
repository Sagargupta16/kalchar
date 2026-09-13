export function ScrollProgress() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed left-0 top-0 z-overlay h-0.5 w-full"
		>
			<div className="scroll-progress-bar h-full origin-left bg-accent" />
		</div>
	);
}
