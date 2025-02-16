import { CheckIcon, XIcon } from "lucide-react";
import { useFetcher } from "react-router";
import { useDoubleCheck } from "~/hooks/use-double-check";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

export function DeleteJournal({ journalId }: { journalId: string }) {
  const { doubleCheck, getButtonProps } = useDoubleCheck();
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="journalId" value={journalId} />
      <Button
        type="submit"
        name="intent"
        value="delete"
        variant="destructive"
        size="icon"
        className={cn(
          "size-6 bg-destructive/15 text-destructive/80 hover:text-white",
          { "bg-destructive text-white": doubleCheck },
        )}
        disabled={isDeleting}
        {...getButtonProps()}
      >
        {doubleCheck ? (
          isDeleting ? (
            <Spinner className="size-2" />
          ) : (
            <CheckIcon className="size-2" />
          )
        ) : (
          <XIcon className="size-2" />
        )}
      </Button>
    </fetcher.Form>
  );
}
