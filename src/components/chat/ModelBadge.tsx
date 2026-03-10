"use client";

function parseModel(model: string) {
  const [provider, ...rest] = model.split(":");

  return {
    provider: provider ?? "model",
    model: rest.join(":") || provider,
  };
}

function providerColor(provider: string) {
  const p = provider.toLowerCase();

  if (p.includes("gemini")) return "bg-[#4285F4]";
  if (p.includes("openai")) return "bg-[#10A37F]";
  if (p.includes("claude")) return "bg-[#D97706]";
  if (p.includes("anthropic")) return "bg-[#D97706]";

  return "bg-[color:var(--accent)]";
}

function providerLabel(provider: string) {
  const p = provider.toLowerCase();

  if (p.includes("gemini")) return "Gemini";
  if (p.includes("openai")) return "OpenAI";
  if (p.includes("claude") || p.includes("anthropic")) return "Claude";

  return provider;
}

export function ModelBadge({ model }: { model: string }) {
  const parsed = parseModel(model);
  const dotColor = providerColor(parsed.provider);
  const provider = providerLabel(parsed.provider);

  return (
    <div className="mb-2 flex items-center justify-start">
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-1)] px-3 py-1.5 text-xs">

        {/* Provider indicator */}
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />

        {/* Provider */}
        <span className="font-medium text-[color:var(--text-0)]">
          {provider}
        </span>

        {/* Model name */}
        <span className="font-mono text-[color:var(--text-2)]">
          {parsed.model}
        </span>

      </div>
    </div>
  );
}