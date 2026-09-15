"use client";

import { useFormStatus } from "react-dom";
import { GoogleIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";

export function SignInButton() {
	const { pending } = useFormStatus();

	return (
		<>
			<Button
				type="submit"
				size="lg"
				disabled={pending}
				aria-busy={pending}
				className="w-full whitespace-normal"
			>
				<GoogleIcon className="size-4 shrink-0" aria-hidden="true" />
				{pending ? "Connecting to Google" : "Continue with Google"}
			</Button>
			<span role="status" className="sr-only">
				{pending ? "Connecting to Google. Please wait." : ""}
			</span>
		</>
	);
}
