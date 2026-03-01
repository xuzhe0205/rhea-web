import { MessageBlock } from "@/components/chat/MessageBlock";

type Msg = {
  id: string;
  senderId: string;
  senderName: string;
  role: "rhea" | "user" | "teammate";
  content: string;
};

export function MessageList({ messages }: { messages: Msg[] }) {
  return (
    <div className="space-y-4">
      {messages.map((m, idx) => {
        const showDivider = idx === 2;
        return (
          <div key={m.id}>
            {showDivider ? (
              <div className="my-6 flex items-center justify-center">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-2)]">
                  — Session continues —
                </div>
              </div>
            ) : null}
            <MessageBlock msg={m} />
          </div>
        );
      })}
    </div>
  );
}