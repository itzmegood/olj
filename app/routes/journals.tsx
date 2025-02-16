import {
  getFormProps,
  getSelectProps,
  getTextareaProps,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Form } from "react-router";
import { z } from "zod";

import { Label } from "~/components/ui/label.js";
import { StatusButton } from "~/components/ui/status-button";
import { Textarea } from "~/components/ui/textarea";
import { useIsPending } from "~/hooks/use-is-pending";
import { requireAuth } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import { db } from "~/lib/db/drizzle.server";
import { journalsTable } from "~/lib/db/schema";
import { redirectWithToast } from "~/lib/toast.server";
import type { Route } from "./+types/journals";

const emotions = ["happy", "sad", "angry", "anxious", "neutral"] as const;
const productivity = ["meh", "ok", "great"] as const;

const schema = z.object({
  content: z.string({ message: "Content is required" }).min(1).max(80),
  emotion: z.enum(emotions, { message: "Emotion is required" }),
  productivity: z.enum(productivity, { message: "Productivity is required" }),
});

export const meta: Route.MetaFunction = () => [
  { title: `Journals • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.clone().formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return redirectWithToast("/journals", {
      title: "Invalid submission. Please try again",
      type: "error",
    });
  }

  const { content, emotion, productivity } = submission.value;

  await db.insert(journalsTable).values({
    content,
    emotion,
    productivity,
    userId: user.id,
  });

  return redirectWithToast("/home", {
    title: "Journal added",
    type: "success",
  });
}

export default function JournalsRoute({ actionData }: Route.ComponentProps) {
  const isAdding = useIsPending({
    formAction: "/journals",
    formMethod: "POST",
  });

  const [form, fields] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    lastResult: actionData,
    constraint: getZodConstraint(schema),
    shouldRevalidate: "onBlur",
  });

  return (
    <>
      <header className="space-y-2 pt-6">
        <h2 className="text-2xl font-bold">One Line</h2>
        <div className="font-semibold">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </header>

      <br />

      <Form method="post" {...getFormProps(form)}>
        <div className="grid gap-6">
          <Textarea
            {...getTextareaProps(fields.content)}
            placeholder="Share your thoughts..."
            aria-label="Share your thoughts..."
            autoComplete="off"
            autoFocus
            rows={8}
            className="resize-none text-3xl font-semibold leading-tight md:text-5xl"
          />

          <div className="grid grid-cols-5 items-center gap-2">
            <Label htmlFor="emotion" className="col-span-3">
              How are you feeling?
            </Label>
            <select
              {...getSelectProps(fields.emotion)}
              name="emotion"
              className="col-span-2 flex w-full rounded-md border border-input bg-muted p-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {emotions.map((emotion) => (
                <option key={emotion} value={emotion}>
                  {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-5 items-center gap-2">
            <Label htmlFor="productivity" className="col-span-3">
              Share your productivity
            </Label>
            <select
              {...getSelectProps(fields.productivity)}
              name="productivity"
              className="col-span-2 flex w-full rounded-md border border-input bg-muted p-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {productivity.map((productivity) => (
                <option key={productivity} value={productivity}>
                  {productivity.charAt(0).toUpperCase() + productivity.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <StatusButton
            isLoading={isAdding}
            name="intent"
            value="add"
            size="lg"
            text="Save Memory"
            aria-label="Save Memory"
            className="rounded-md"
          />
        </div>
        {fields.content.errors && (
          <p
            className="text-xs text-destructive"
            role="alert"
            aria-live="polite"
          >
            {fields.content.errors.join(", ")}
          </p>
        )}
      </Form>
    </>
  );
}
