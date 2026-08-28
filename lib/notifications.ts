import { sql, execute } from "@/lib/db";

export async function notify(input: {
  userId: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number | null;
}) {
  try {
    await execute(
      `INSERT INTO Notifications (UserId, Title, Message, Type, ReferenceId, IsRead, CreatedAt)
       VALUES (@userId, @title, @message, @type, @referenceId, 0, GETDATE())`,
      {
        userId: { type: sql.Int, value: input.userId },
        title: { type: sql.NVarChar(150), value: input.title },
        message: { type: sql.NVarChar(500), value: input.message.slice(0, 500) },
        type: { type: sql.NVarChar(50), value: input.type },
        referenceId: { type: sql.Int, value: input.referenceId ?? null },
      },
    );
  } catch (error) {
    console.error("Failed to create notification");
    console.error(error);
  }
}
