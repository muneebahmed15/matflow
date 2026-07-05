const BUFFER_API = 'https://api.bufferapp.com/1';

export async function scheduleBufferPost(input: {
  accessToken: string;
  profileIds: string[];
  text: string;
  mediaUrl?: string;
  scheduledAt?: Date;
}): Promise<{ postIds: string[] }> {
  if (!input.accessToken || input.profileIds.length === 0) {
    return { postIds: [] };
  }

  const postIds: string[] = [];
  for (const profileId of input.profileIds) {
    const body: Record<string, string> = {
      text: input.text,
      profile_ids: profileId,
    };
    if (input.mediaUrl) body['media[photo]'] = input.mediaUrl;
    if (input.scheduledAt) body.scheduled_at = Math.floor(input.scheduledAt.getTime() / 1000).toString();

    const response = await fetch(`${BUFFER_API}/updates/create.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    });

    const data = (await response.json()) as { updates?: Array<{ id?: string }>; message?: string };
    const id = data.updates?.[0]?.id;
    if (id) postIds.push(String(id));
  }

  return { postIds };
}

export async function publishBufferPost(input: {
  accessToken: string;
  profileIds: string[];
  text: string;
  mediaUrl?: string;
}): Promise<{ postIds: string[] }> {
  return scheduleBufferPost({ ...input, scheduledAt: undefined });
}
