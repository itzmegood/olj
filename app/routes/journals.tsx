import { parseWithZod } from "@conform-to/zod";
import { endOfMonth, getMonth, getYear, startOfMonth } from "date-fns";
import { eq } from "drizzle-orm";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import React from "react";
import { data, Link, useSearchParams, useSubmit } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { requireAuth } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import { db } from "~/lib/db/drizzle.server";
import { journalsTable } from "~/lib/db/schema";
import { redirectWithToast } from "~/lib/toast.server";
import type { Route } from "./+types/journals";
import { JournalEntry } from "./home";
import { emotions } from "./journals.new";

const schema = z.object({
  journalId: z.string({ message: "Journal ID is required" }),
});

export const meta: Route.MetaFunction = () => [
  { title: `Journals • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const url = new URL(request.url);

  // Get filter parameters
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");
  const emotion = url.searchParams.get("emotion");
  const search = url.searchParams.get("q")?.toLowerCase();

  // Base query
  let query = db.query.journalsTable.findMany({
    where: (journal, { eq, and, gte, lte, like }) => {
      const conditions = [eq(journal.userId, user.id)];

      // Add date filters if year/month are provided
      if (year && month) {
        const startDate = startOfMonth(
          new Date(parseInt(year), parseInt(month) - 1),
        );
        const endDate = endOfMonth(
          new Date(parseInt(year), parseInt(month) - 1),
        );
        conditions.push(gte(journal.createdAt, startDate));
        conditions.push(lte(journal.createdAt, endDate));
      }

      // Add emotion filter
      if (emotion) {
        conditions.push(eq(journal.emotion, emotion));
      }

      // Add search filter
      if (search) {
        conditions.push(like(journal.content, `%${search}%`));
      }

      return and(...conditions);
    },
    orderBy: (journal, { desc }) => desc(journal.createdAt),
  });

  const journals = await query;

  return data({
    user,
    journals,
    filters: {
      year: year || new Date().getFullYear(),
      month: month || new Date().getMonth() + 1,
      emotion: emotion || "all",
      search: search || "",
    },
  });
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

function SearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search journals..."
        className="pl-8"
        defaultValue={searchParams.get("q") || ""}
        onChange={(e) => {
          const newParams = new URLSearchParams(searchParams);
          if (e.target.value) {
            newParams.set("q", e.target.value);
          } else {
            newParams.delete("q");
          }
          setSearchParams(newParams);
        }}
      />
    </div>
  );
}

function EmotionFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="flex gap-2">
      {["all", ...emotions].map((emotion) => (
        <Button
          key={emotion}
          variant={
            searchParams.get("emotion") === emotion ? "default" : "outline"
          }
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            if (emotion === "all") {
              newParams.delete("emotion");
            } else {
              newParams.set("emotion", emotion);
            }
            setSearchParams(newParams);
          }}
          className="capitalize"
        >
          {emotion}
        </Button>
      ))}
    </div>
  );
}

function DateFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = React.useState(false);
  const currentDate = new Date();
  const selectedYear = parseInt(
    searchParams.get("year") ?? currentDate.getFullYear().toString(),
  );
  const selectedMonth = parseInt(
    searchParams.get("month") ?? (currentDate.getMonth() + 1).toString(),
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handlePrevMonth = () => {
    const date = new Date(selectedYear, selectedMonth - 2);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("year", getYear(date).toString());
      newParams.set("month", (getMonth(date) + 1).toString());
      return newParams;
    });
  };

  const handleNextMonth = () => {
    const date = new Date(selectedYear, selectedMonth);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("year", getYear(date).toString());
      newParams.set("month", (getMonth(date) + 1).toString());
      return newParams;
    });
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("month", (monthIndex + 1).toString());
      return newParams;
    });
    setIsOpen(false);
  };

  const handleYearChange = (delta: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("year", (selectedYear + delta).toString());
      return newParams;
    });
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-fit"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {months[selectedMonth - 1]} {selectedYear}
          </span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Date</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleYearChange(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold">{selectedYear}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleYearChange(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {months.map((month, index) => (
                <Button
                  key={month}
                  variant={selectedMonth === index + 1 ? "default" : "ghost"}
                  className="h-auto py-2"
                  onClick={() => handleMonthSelect(index)}
                >
                  {month.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteButton({ journalId }: { journalId: string }) {
  const submit = useSubmit();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this journal?")) {
      const formData = new FormData();
      formData.append("journalId", journalId);
      submit(formData, { method: "DELETE" });
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export default function JournalsRoute({
  loaderData: { journals, filters },
}: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Journals</h1>
        <Button asChild>
          <Link to="/journals/new">
            New Journal
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <DateFilter />
        <div className="flex flex-col gap-4">
          <SearchBar />
          <div className="overflow-x-auto [scrollbar-width:none]">
            <EmotionFilter />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {journals.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No journals found. Try adjusting your filters.
          </div>
        ) : (
          journals.map((journal) => (
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
          ))
        )}
      </div>
    </div>
  );
}
