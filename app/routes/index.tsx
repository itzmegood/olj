import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { requireAnonymous } from "~/lib/auth/session.server";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "React Router(v7) x Remix Auth" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request, "/home");

  return null;
}

export default function IndexRoute() {
  return (
    <div className="h-dvh bg-foreground p-4">
      <section className="flex h-full w-full flex-1 flex-col items-center justify-center gap-6 rounded-t-full bg-background p-4 text-center sm:rounded-xl">
        <div className="text-7xl font-extrabold">One Line Journal</div>
        <p className="text-2xl">
          Capture your thoughts and ideas in one line at a time.
        </p>
        <Button size="lg" className="rounded-xl" asChild>
          <Link to="/auth/login">
            Get Started <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
