import api from "@/lib/api-client";

export interface LinkMetadata {
  url: string;
  title: string | null;
  icon: string | null;
  provider: string;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const { data } = await api.post<LinkMetadata>('/links/metadata', { url });
  return data;
}
