import { MessageBlock } from "@/components/chat/MessageBlock";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export function MessageList({ messages }: { messages: Msg[] }) {
  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <div key={m.id}>
          <MessageBlock msg={m} />
        </div>
      ))}
    </div>
  );
}