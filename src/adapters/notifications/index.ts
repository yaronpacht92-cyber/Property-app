export interface NotificationAdapter {
  name: string;
  sendEmailReminder?(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<{ ok: boolean; mode: "mock" | "live" }>;
}

export class MockNotificationAdapter implements NotificationAdapter {
  name = "notifications-mock";

  async sendEmailReminder() {
    return { ok: true, mode: "mock" as const };
  }
}

export function getNotificationAdapter(): NotificationAdapter {
  return new MockNotificationAdapter();
}
