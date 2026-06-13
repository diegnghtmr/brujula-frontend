import { cn } from "@/lib/utils";

// Card uses rounded-none and shadow-none (overrides shadcn default)
function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card text-card-foreground rounded-none shadow-none border", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- generic wrapper: content always injected by callers via children prop; never rendered empty
    <h3
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
