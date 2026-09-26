import type { CSSProperties } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { Reveal } from "@/components/motion/reveal";
import type { Artwork } from "@/lib/types";

/** Resting pose per plate: offset from centre, turn and float phase. */
const POSES = [
	{ x: "-74%", y: "8%", rotate: "-10deg", delay: "0s", z: 1 },
	{ x: "0%", y: "-4%", rotate: "2deg", delay: "-2.5s", z: 3 },
	{ x: "72%", y: "12%", rotate: "9deg", delay: "-5s", z: 2 },
] as const;

/**
 * Three paintings fanned on the /work masthead (lg only, decorative: the
 * same pieces lead the grid below). Each plate sits at its own ratio, turns
 * off its neighbour and breathes on its own float phase; hovering the fan
 * straightens a plate. Lazy images, so phones (where it is hidden) never
 * fetch them.
 */
export function PlateFan({ artworks }: Readonly<{ artworks: readonly Artwork[] }>) {
	const plates = artworks.slice(0, POSES.length);
	if (plates.length === 0) return null;
	return (
		<div aria-hidden="true" className="relative mx-auto hidden h-[20rem] w-full max-w-md lg:block">
			{plates.map((art, i) => {
				const pose = POSES[i] ?? POSES[0];
				return (
					<Reveal
						key={art.slug}
						eager
						delayMs={260 + i * 120}
						distance={60}
						className="absolute top-1/2 left-1/2 w-[10.5rem]"
					>
						<div
							className="group/fan -translate-x-1/2 -translate-y-1/2"
							style={{ zIndex: pose.z } as CSSProperties}
						>
							<div
								className="plate-float"
								style={
									{
										"--float-delay": pose.delay,
										"--float-travel": "8px",
									} as CSSProperties
								}
							>
								<div
									className="relative overflow-hidden rounded-md shadow-e3 ring-1 ring-(--color-gold-hairline) rotate-(--pose-rotate) transition-transform duration-(--duration-unveil) ease-(--ease-out) group-hover/fan:scale-105 group-hover/fan:rotate-0"
									style={
										{
											aspectRatio: art.aspectRatio,
											translate: `${pose.x} ${pose.y}`,
											"--pose-rotate": pose.rotate,
										} as CSSProperties
									}
								>
									<ArtImage
										src={`/artworks/${art.image}`}
										alt=""
										sizes="12rem"
										maxWidth={400}
										className="absolute inset-0 h-full w-full object-contain"
									/>
								</div>
							</div>
						</div>
					</Reveal>
				);
			})}
		</div>
	);
}
