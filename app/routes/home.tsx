import { parseWithZod } from "@conform-to/zod";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";
import { data, Link } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button.js";
import { requireAuth } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import { db } from "~/lib/db/drizzle.server";
import { journalsTable } from "~/lib/db/schema";
import { redirectWithToast } from "~/lib/toast.server";
import type { Route } from "./+types/home";
import { emotions } from "./journals.new";

const schema = z.object({
  journalId: z.string({ message: "Journal ID is required" }),
});

export const meta: Route.MetaFunction = () => [
  { title: `Journals • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const journals = await db.query.journalsTable.findMany({
    where: (journal, { eq, gte }) =>
      eq(journal.userId, user.id) && gte(journal.createdAt, sevenDaysAgo),
    orderBy: (journal, { desc }) => desc(journal.createdAt),
  });

  const mostCommonEmotion = journals.reduce(
    (acc, journal) => {
      if (journal.emotion) {
        acc[journal.emotion as (typeof emotions)[number]] =
          (acc[journal.emotion as (typeof emotions)[number]] || 0) + 1;
      }
      return acc;
    },
    {} as Record<(typeof emotions)[number], number>,
  );

  return data({ user, journals, mostCommonEmotion });
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.clone().formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return redirectWithToast("/home", {
      title: "Invalid submission. Please try again",
      type: "error",
    });
  }

  const { journalId } = submission.value;
  const journal = await db.query.journalsTable.findFirst({
    where: (journal, { eq }) =>
      eq(journal.id, journalId) && eq(journal.userId, user.id),
  });

  if (!journal) {
    return redirectWithToast("/home", {
      title: "Journal not found",
      type: "error",
    });
  }

  await db.delete(journalsTable).where(eq(journalsTable.id, journalId));
  return redirectWithToast("/home", {
    title: "Journal deleted",
    type: "success",
  });
}

function WeekDay({
  date,
  isToday,
  hasJournal,
}: {
  date: Date;
  isToday: boolean;
  hasJournal: boolean;
}) {
  const dayClasses = isToday
    ? "rounded-full px-1 bg-background  py-2 -my-2 text-foreground"
    : "";
  const dotClasses = hasJournal
    ? isToday
      ? "bg-foreground"
      : "bg-background"
    : "bg-transparent";

  return (
    <div className={`flex flex-col items-center gap-2 ${dayClasses}`}>
      <span className="font-light uppercase">
        {date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3)}
      </span>
      <span className="text-base font-bold">
        {date.getDate().toString().padStart(2, "0")}
      </span>
      <div className={`h-2 w-2 rounded-full ${dotClasses}`} />
    </div>
  );
}

export function JournalEntry({
  journal,
}: {
  journal: {
    id: string;
    content: string;
    emotion: string;
    productivity: string;
    createdAt: Date;
  };
}) {
  return (
    <div>
      <div className="flex justify-between p-2">
        <div>{format(journal.createdAt, "dd/MM/yyyy")}</div>
        <div>{format(journal.createdAt, "EEEE")}</div>
      </div>
      <div className="rounded-xl bg-accent p-2">
        <div className="flex flex-col gap-2 rounded-md border-2 border-dashed border-primary/70 p-4">
          <p className="text-lg">{journal.content}</p>
          <div className="flex justify-between text-sm capitalize">
            <p className="rounded-sm bg-muted px-2 py-1">{journal.emotion}</p>
            <p className="rounded-sm bg-muted px-2 py-1">
              {journal.productivity}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JournalsRoute({
  loaderData: { user, journals, mostCommonEmotion },
}: Route.ComponentProps) {
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        Hey {user.displayName}! <span className="text-2xl">👋</span>
      </h2>

      <header className="-mx-2 h-full rounded-xl bg-foreground p-4 pb-6 text-background">
        <div className="mb-4 flex items-center justify-between px-2 sm:px-6">
          <h2 className="text-lg font-semibold sm:text-xl">
            {now.toLocaleDateString(undefined, { month: "long" })}
          </h2>
          <Link to="/journals" className="text-xs hover:underline sm:text-sm">
            See all
          </Link>
        </div>
        <div className="grid h-full grid-flow-col gap-2 px-2 sm:gap-4">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - 3 + i);
            const isToday = new Date().getDate() === date.getDate();
            const hasJournal = journals.some((journal) => {
              const journalDate = new Date(journal.createdAt);
              return (
                journalDate.getDate() === date.getDate() &&
                journalDate.getMonth() === date.getMonth() &&
                journalDate.getFullYear() === date.getFullYear()
              );
            });

            return (
              <WeekDay
                key={i}
                date={date}
                isToday={isToday}
                hasJournal={hasJournal}
              />
            );
          })}
        </div>
      </header>

      <Button
        variant="secondary"
        size="lg"
        className="justify-between p-6"
        asChild
      >
        <Link to="/journals/new">
          <div className="text-lg font-medium">Add reflection</div>
          <ArrowUpRight size={16} />
        </Link>
      </Button>

      {journals.map((journal) => (
        <JournalEntry
          key={journal.id}
          journal={{
            id: journal.id,
            content: journal.content ?? "",
            emotion: journal.emotion ?? "",
            productivity: journal.productivity ?? "",
            createdAt: journal.createdAt,
          }}
        />
      ))}
    </div>
  );
}
