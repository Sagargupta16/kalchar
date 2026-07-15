export function ScrollProgress() {
	return (
		<div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 h-[2px] w-full">
			<div className="scroll-progress-bar h-full origin-left bg-accent" />
		</div>
	);
}
